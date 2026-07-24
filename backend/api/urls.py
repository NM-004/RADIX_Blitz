from django.urls import path
from . import views

urlpatterns = [
    path('companies/', views.list_companies, name='list_companies'),
    path('samples/', views.list_samples, name='list_samples'),
    path('profiles/', views.manage_profiles, name='manage_profiles'),
    path('profiles/<str:profile_id>/', views.manage_profiles, name='profile_detail'),
    path('profiles/upload-cv/', views.upload_cv, name='upload_cv'),
    path('history/talent-check/', views.talent_check_history, name='talent_check_history'),
    path('history/skill-match/', views.skill_match_history, name='skill_match_history'),
]
