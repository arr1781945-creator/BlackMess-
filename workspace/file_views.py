from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.conf import settings
import os
import uuid
from .models import FileUpload, Message, Channel
from .serializers import FileUploadSerializer


class FileUploadView(APIView):
    """Handle file uploads"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        uploaded_file = request.FILES.get('file')
        channel_id = request.data.get('channel_id')
        message_text = request.data.get('message', '')
        
        if not uploaded_file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not channel_id:
            return Response(
                {'error': 'Channel ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get channel
            channel = Channel.objects.get(id=channel_id)
            workspace = channel.workspace
            
            # Generate unique filename
            ext = os.path.splitext(uploaded_file.name)[1]
            filename = f"{uuid.uuid4()}{ext}"
            
            # Save file
            file_path = f"uploads/{workspace.id}/{channel.id}/{filename}"
            saved_path = default_storage.save(file_path, uploaded_file)
            file_url = default_storage.url(saved_path)
            
            # Determine file type
            file_type = self.get_file_type(uploaded_file.content_type)
            
            # Create message
            message = Message.objects.create(
                channel=channel,
                user=request.user,
                text=message_text or f"Shared a file: {uploaded_file.name}",
                message_type='file'
            )
            
            # Create file upload record
            file_upload = FileUpload.objects.create(
                workspace=workspace,
                channel=channel,
                message=message,
                uploaded_by=request.user,
                filename=uploaded_file.name,
                file_type=file_type,
                file_url=file_url,
                file_size=uploaded_file.size,
                mime_type=uploaded_file.content_type
            )
            
            serializer = FileUploadSerializer(file_upload)
            
            return Response({
                'message': 'File uploaded successfully',
                'file': serializer.data,
                'message_id': str(message.id)
            }, status=status.HTTP_201_CREATED)
            
        except Channel.DoesNotExist:
            return Response(
                {'error': 'Channel not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_file_type(self, mime_type):
        """Determine file type from MIME type"""
        if mime_type.startswith('image/'):
            return 'image'
        elif mime_type.startswith('video/'):
            return 'video'
        elif mime_type.startswith('audio/'):
            return 'audio'
        elif mime_type in ['application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            return 'document'
        elif mime_type in ['application/zip', 'application/x-rar-compressed']:
            return 'archive'
        else:
            return 'other'


class FileListView(APIView):
    """List files in workspace or channel"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        workspace_id = request.query_params.get('workspace')
        channel_id = request.query_params.get('channel')
        
        queryset = FileUpload.objects.select_related(
            'uploaded_by', 'channel', 'message'
        )
        
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        
        if channel_id:
            queryset = queryset.filter(channel_id=channel_id)
        
        queryset = queryset.order_by('-created_at')[:50]
        
        serializer = FileUploadSerializer(queryset, many=True)
        return Response(serializer.data)
