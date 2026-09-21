from app.utils.slugs import slugify


def test_slugify_basic() -> None:
    assert slugify("F-10 Markaz") == "f-10-markaz"
    assert slugify("  Head Chef  ") == "head-chef"
