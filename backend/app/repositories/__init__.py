from app.models import (AnalyticsEvent, Booking, Customer, CustomerNote, GalleryImage, Invoice, Lead, MarketingCampaign,
                        Payment, Review, ReviewRequest, Service, ServiceCategory, Staff, Testimonial)
from app.repositories.base import TenantRepository


def _repo(m):
    return type(f"{m.__name__}Repository", (TenantRepository,), {"model": m})


ServiceRepository = _repo(Service)
ServiceCategoryRepository = _repo(ServiceCategory)
GalleryRepository = _repo(GalleryImage)
StaffRepository = _repo(Staff)
TestimonialRepository = _repo(Testimonial)
CustomerRepository = _repo(Customer)
CustomerNoteRepository = _repo(CustomerNote)
LeadRepository = _repo(Lead)
BookingRepository = _repo(Booking)
ReviewRepository = _repo(Review)
ReviewRequestRepository = _repo(ReviewRequest)
PaymentRepository = _repo(Payment)
InvoiceRepository = _repo(Invoice)
CampaignRepository = _repo(MarketingCampaign)
EventRepository = _repo(AnalyticsEvent)
