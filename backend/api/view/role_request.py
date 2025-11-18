from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from ..models import RoleRequest
from ..serializers import RoleRequestSerializer

class RoleRequestViewSet(viewsets.ModelViewSet):
    serializer_class = RoleRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RoleRequest.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RoleRequestAdminViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    def list(self, request):
        requests = RoleRequest.objects.filter(status='pending')
        serializer = RoleRequestSerializer(requests, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        role_request = RoleRequest.objects.get(pk=pk)
        if role_request.status == 'approved':
            return Response({'detail': 'Already approved.'}, status=400)
        role_request.status = 'approved'
        role_request.save()

        user = role_request.user
        user.role = role_request.requested_role
        if user.role in ['staff', 'admin']:
            user.is_staff = True
        if user.role == 'admin':
            user.is_superuser = True
        user.save()
        return Response({'detail': 'Role request approved and user role updated.'}, status=200)

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        role_request = RoleRequest.objects.get(pk=pk)
        if role_request.status == 'rejected':
            return Response({'detail': 'Already rejected.'}, status=400)
        role_request.status = 'rejected'
        role_request.save()
        return Response({'detail': 'Role request rejected.'}, status=200)
