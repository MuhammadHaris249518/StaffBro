from collections import Counter

from app.seed.catalog_data import ISLAMABAD_AREAS, PROFESSIONS, RAWALPINDI_AREAS, SKILLS


def test_profession_slugs_unique() -> None:
    slugs = [row[0] for row in PROFESSIONS]
    assert len(slugs) == len(set(slugs))
    assert len(PROFESSIONS) == 8


def test_skill_slugs_unique() -> None:
    slugs = [row[0] for row in SKILLS]
    dupes = [s for s, n in Counter(slugs).items() if n > 1]
    assert dupes == []
    assert 60 <= len(SKILLS) <= 120


def test_skill_profession_fks_exist() -> None:
    profession_slugs = {row[0] for row in PROFESSIONS}
    for slug, profession_slug, *_ in SKILLS:
        if profession_slug is not None:
            assert profession_slug in profession_slugs, slug


def test_area_slugs_unique_per_city() -> None:
    assert len({a[0] for a in ISLAMABAD_AREAS}) == len(ISLAMABAD_AREAS)
    assert len({a[0] for a in RAWALPINDI_AREAS}) == len(RAWALPINDI_AREAS)
    assert len(ISLAMABAD_AREAS) + len(RAWALPINDI_AREAS) >= 40


def test_every_row_has_urdu_name() -> None:
    for _, name_en, name_ur, *_ in PROFESSIONS:
        assert name_en and name_ur
    for _, _, name_en, name_ur, *_ in SKILLS:
        assert name_en and name_ur
