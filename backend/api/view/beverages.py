# api/views/beverages.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from ..models import BeverageCategory, Beverage
from ..serializers import BeverageCategorySerializer, BeverageSerializer
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny | IsAdminUser])
def get_categories(request):
    """
    Get all beverage categories (public access)
    """
    try:
        categories = BeverageCategory.objects.all()
        serializer = BeverageCategorySerializer(categories, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        return Response({"error": "Failed to retrieve categories."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
@permission_classes([AllowAny])
def get_beverages(request):
    """
    Get all beverages (public access)
    """
    try:
        beverages = Beverage.objects.all()
        serializer = BeverageSerializer(beverages, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error fetching beverages: {str(e)}")
        return Response({"error": "Failed to retrieve beverages."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_beverage_detail(request, pk):
    try:
        beverage = Beverage.objects.get(pk=pk)
        serializer = BeverageSerializer(beverage)
        return Response(serializer.data)
    except Beverage.DoesNotExist:
        return Response({"error": "Beverage not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error fetching beverage details: {str(e)}")
        return Response({"error": "Failed to retrieve beverage details."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework import viewsets

class BeverageCategoryViewSet(viewsets.ModelViewSet):
    queryset = BeverageCategory.objects.all()
    serializer_class = BeverageCategorySerializer
    permission_classes = [IsAdminUser | IsAuthenticatedOrReadOnly] 

class BeverageViewSet(viewsets.ModelViewSet):
    queryset = Beverage.objects.all()
    serializer_class = BeverageSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]



