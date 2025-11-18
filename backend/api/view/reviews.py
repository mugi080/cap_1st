from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view
from ..models import Review
from ..serializers import ReviewSerializer

# Create or update review
class CreateOrUpdateReview(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data
        try:
            review = user.review
            review.review_text = data.get('review_text', review.review_text)
            review.rating = data.get('rating', review.rating)
            review.save()
        except Review.DoesNotExist:
            review = Review.objects.create(
                user=user,
                review_text=data.get('review_text'),
                rating=data.get('rating', 5)
            )
        serializer = ReviewSerializer(review)
        return Response(serializer.data, status=200)


# Get all reviews
@api_view(['GET'])
def get_all_reviews(request):
    reviews = Review.objects.all()
    serializer = ReviewSerializer(reviews, many=True)
    return Response(serializer.data)
