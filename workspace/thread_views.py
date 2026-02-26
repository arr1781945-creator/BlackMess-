from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from .models import Message, Channel
from .serializers import MessageSerializer, MessageThreadSerializer


class ThreadDetailView(APIView):
    """Get thread with all replies"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, message_id):
        try:
            # Get parent message
            parent = Message.objects.get(id=message_id, is_deleted=False)
            
            # Check channel access
            if not parent.channel.channel_members.filter(user=request.user).exists():
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get all replies
            replies = Message.objects.filter(
                parent_message=parent,
                is_deleted=False
            ).select_related('user').order_by('created_at')
            
            # Serialize
            parent_data = MessageThreadSerializer(parent, context={'request': request}).data
            
            return Response({
                'parent': parent_data,
                'replies': MessageSerializer(replies, many=True, context={'request': request}).data,
                'reply_count': replies.count()
            })
            
        except Message.DoesNotExist:
            return Response(
                {'error': 'Message not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ThreadReplyView(APIView):
    """Reply to a message (create thread)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, message_id):
        try:
            # Get parent message
            parent = Message.objects.get(id=message_id, is_deleted=False)
            
            # Check channel access
            if not parent.channel.channel_members.filter(user=request.user).exists():
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            text = request.data.get('text', '').strip()
            if not text:
                return Response(
                    {'error': 'Message text required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create reply
            reply = Message.objects.create(
                channel=parent.channel,
                user=request.user,
                text=text,
                parent_message=parent,
                message_type='text'
            )
            
            # Update parent reply count
            parent.reply_count = parent.replies.count()
            parent.save(update_fields=['reply_count'])
            
            serializer = MessageSerializer(reply, context={'request': request})
            
            return Response({
                'message': 'Reply added successfully',
                'reply': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Message.DoesNotExist:
            return Response(
                {'error': 'Message not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ThreadListView(generics.ListAPIView):
    """List all threads in a channel"""
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        channel_id = self.request.query_params.get('channel')
        
        if not channel_id:
            return Message.objects.none()
        
        # Get messages with replies (threads)
        return Message.objects.filter(
            channel_id=channel_id,
            parent_message__isnull=True,
            is_deleted=False
        ).annotate(
            reply_count_actual=Count('replies')
        ).filter(
            reply_count_actual__gt=0
        ).select_related('user').order_by('-updated_at')
