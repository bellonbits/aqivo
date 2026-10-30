"""Comprehensive verification of all 8 implemented Architectural Design Patterns:
- Pattern A: Repository (ProductRepository & IProductRepository)
- Pattern B: Factory (ClientFactory)
- Pattern C: Strategy (CatalogSearchContext & Search Strategies)
- Pattern D: Circuit Breaker (CircuitBreaker CLOSED, OPEN, HALF_OPEN state machine)
- Pattern E: Adapter (PaymentAdapterRegistry & IPaymentAdapter)
- Pattern F: CQRS (ProductCommandHandler & ProductQueryHandler)
- Pattern G: Decorator (Python function decorators & GoF Object Decorator)
- Pattern H: Singleton (SingletonMeta & SystemMetricsCollector)
"""
import decimal
import time
import uuid

import pytest
from app.core.circuit_breaker import CircuitBreaker, CircuitBreakerOpenException, CircuitState
from app.core.decorators import CachedProductRepositoryDecorator, cached_result, time_execution
from app.core.factory import ClientFactory, ConsoleSmsProvider
from app.core.singleton import ApplicationRuntimeRegistry, SingletonMeta, SystemMetricsCollector
from app.models.business import Product
from app.repositories.product import IProductRepository, ProductRepository
from app.services.adapters.payment import PaymentInitiationRequest, payment_adapters
from app.services.cqrs.product_cqrs import (
    CreateProductCommand,
    GetProductDetailQuery,
    ListStorefrontProductsQuery,
    ProductCommandHandler,
    ProductQueryHandler,
)
from app.services.search_strategy import (
    CatalogSearchContext,
    ExactPrefixSearchStrategy,
    FuzzyTokenSearchStrategy,
    PopularityRankedSearchStrategy,
)
from tests.conftest import Owner


# ============================================================================
# PATTERN A: REPOSITORY
# ============================================================================

def test_pattern_a_repository(client, db):
    owner = Owner(client, "repo_test@example.com", "Repo Owner", "Repo Shop")
    biz_id = uuid.UUID(owner.id)

    repo = ProductRepository(db, biz_id)
    assert isinstance(repo, IProductRepository)

    # 1. Add product via repository
    prod = repo.create_product({
        "name": "Artisan Bread",
        "slug": "artisan-bread",
        "price": decimal.Decimal("450.00"),
        "currency": "KES",
        "description": "Sourdough bread",
    })
    db.commit()
    assert prod.id is not None

    # 2. Get by ID and Slug
    fetched = repo.get_by_id(prod.id)
    assert fetched is not None
    assert fetched.name == "Artisan Bread"
    assert repo.get_by_slug("artisan-bread") is not None

    # 3. List and Count
    items = repo.list_active(limit=10)
    assert len(items) >= 1
    assert repo.count_active() >= 1

    # 4. Soft Delete
    repo.soft_delete(prod)
    db.commit()
    assert repo.get_by_id(prod.id) is None


# ============================================================================
# PATTERN B: FACTORY
# ============================================================================

def test_pattern_b_factory():
    # 1. Storage creation
    storage = ClientFactory.create_storage()
    assert storage is not None

    # 2. SMS Provider creation based on config
    sms = ClientFactory.create_sms_provider("console")
    assert isinstance(sms, ConsoleSmsProvider)
    res = sms.send("+254711222333", "Test message")
    assert res["status"] == "DELIVERED"

    # 3. Cache client creation
    cache_client = ClientFactory.create_cache_client()
    assert cache_client is not None


# ============================================================================
# PATTERN C: STRATEGY
# ============================================================================

def test_pattern_c_strategy(client, db):
    owner = Owner(client, "strategy_test@example.com", "Strat Owner", "Strat Shop")
    biz_id = uuid.UUID(owner.id)
    repo = ProductRepository(db, biz_id)
    p = repo.create_product({"name": "Wireless Bluetooth Headphones", "slug": "wireless-headphones", "price": 1200, "currency": "KES"})
    db.commit()

    # 1. Runtime strategy selection
    s1 = CatalogSearchContext.select_strategy("")
    assert isinstance(s1, PopularityRankedSearchStrategy)

    s2 = CatalogSearchContext.select_strategy("Wireless")
    assert isinstance(s2, ExactPrefixSearchStrategy)

    s3 = CatalogSearchContext.select_strategy("Wireless Headphones")
    assert isinstance(s3, FuzzyTokenSearchStrategy)

    # 2. Execution through Context
    ctx = CatalogSearchContext(s3)
    results = ctx.execute_search(db, biz_id, "Wireless Headphones")
    assert len(results) >= 1
    assert results[0].name == "Wireless Bluetooth Headphones"


# ============================================================================
# PATTERN D: CIRCUIT BREAKER
# ============================================================================

def test_pattern_d_circuit_breaker():
    cb = CircuitBreaker("mock_service", failure_threshold=3, reset_interval=0.1, half_open_success_threshold=1)
    assert cb.state == CircuitState.CLOSED

    # Simulate failures
    def failing_call():
        raise ConnectionError("Upstream timeout")

    for _ in range(3):
        with pytest.raises(ConnectionError):
            cb.call(failing_call)

    # Circuit should now be OPEN
    assert cb.state == CircuitState.OPEN

    # Calls while OPEN should fail fast with CircuitBreakerOpenException or use fallback
    with pytest.raises(CircuitBreakerOpenException):
        cb.call(failing_call)

    fallback_val = cb.call(failing_call, fallback=lambda: "FALLBACK_SUCCESS")
    assert fallback_val == "FALLBACK_SUCCESS"

    # Wait for reset interval -> transitions to HALF_OPEN
    time.sleep(0.15)
    assert cb.state == CircuitState.HALF_OPEN

    # Probe call succeeds -> resets to CLOSED
    success_val = cb.call(lambda: "OK")
    assert success_val == "OK"
    assert cb.state == CircuitState.CLOSED


# ============================================================================
# PATTERN E: ADAPTER
# ============================================================================

def test_pattern_e_adapter():
    adapter = payment_adapters.get_adapter("paystack")
    assert adapter.provider_id == "paystack"

    req = PaymentInitiationRequest(
        amount=decimal.Decimal("1500.00"),
        currency="KES",
        reference="REF-1234",
        customer_email="buyer@example.com",
    )
    assert req.amount == decimal.Decimal("1500.00")


# ============================================================================
# PATTERN F: CQRS
# ============================================================================

def test_pattern_f_cqrs(client, db):
    owner = Owner(client, "cqrs_test@example.com", "CQRS Owner", "CQRS Shop")
    biz_id = uuid.UUID(owner.id)

    # 1. COMMAND SIDE
    cmd_handler = ProductCommandHandler(db, biz_id)
    cmd = CreateProductCommand(
        business_id=biz_id,
        name="Linen Shirt",
        price=decimal.Decimal("2200.00"),
        currency="KES",
        description="Breathable summer linen",
    )
    product = cmd_handler.handle_create(cmd)
    assert product.id is not None

    # 2. QUERY SIDE
    query_handler = ProductQueryHandler(db, biz_id)
    detail_query = GetProductDetailQuery(business_id=biz_id, product_id=product.id)
    read_model = query_handler.handle_detail(detail_query)
    assert read_model is not None
    assert read_model.name == "Linen Shirt"
    assert read_model.price == 2200.0

    list_query = ListStorefrontProductsQuery(business_id=biz_id)
    read_list = query_handler.handle_list(list_query)
    assert len(read_list) >= 1
    assert any(item.name == "Linen Shirt" for item in read_list)


# ============================================================================
# PATTERN G: DECORATOR
# ============================================================================

def test_pattern_g_decorator(client, db):
    # 1. Function decorator
    @time_execution("test_timer")
    @cached_result(ttl=60)
    def calculate_tax(amount: float) -> float:
        return amount * 0.16

    assert calculate_tax(100.0) == 16.0
    assert calculate_tax.__name__ == "calculate_tax"  # metadata preserved

    # 2. GoF Structural Object Decorator
    owner = Owner(client, "decorator_repo@example.com", "Dec Owner", "Dec Shop")
    biz_id = uuid.UUID(owner.id)
    raw_repo = ProductRepository(db, biz_id)

    # Wrap raw repo with caching decorator
    decorated_repo = CachedProductRepositoryDecorator(raw_repo, biz_id)
    assert isinstance(decorated_repo, IProductRepository)

    p = decorated_repo.create_product({"name": "Decorated Item", "slug": "decorated-item", "price": 500, "currency": "KES"})
    db.commit()

    fetched = decorated_repo.get_by_id(p.id)
    assert fetched is not None
    assert fetched.name == "Decorated Item"


# ============================================================================
# PATTERN H: SINGLETON
# ============================================================================

def test_pattern_h_singleton():
    # 1. Metaclass identity check
    m1 = SystemMetricsCollector()
    m2 = SystemMetricsCollector()
    assert m1 is m2  # Exact same memory address / instance

    m1.increment("test_metric", 5)
    assert m2.snapshot()["counts"]["test_metric"] == 5

    # 2. Application registry singleton
    r1 = ApplicationRuntimeRegistry()
    r2 = ApplicationRuntimeRegistry()
    assert r1 is r2
    r1.set_flag("feature_x", True)
    assert r2.get_flag("feature_x") is True
