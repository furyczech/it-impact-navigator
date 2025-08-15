-- SQL to insert dependencies
INSERT INTO public.dependencies (
      id, source_id, target_id, type, description, criticality, last_updated
    ) VALUES (
      '1755180769606',
      '1755175825189',
      '1755174878123',
      'uses',
      '',
      'critical',
      '2025-08-15T08:16:51.238Z'
    ) ON CONFLICT (id) DO UPDATE SET
      source_id = EXCLUDED.source_id,
      target_id = EXCLUDED.target_id,
      type = EXCLUDED.type,
      description = EXCLUDED.description,
      criticality = EXCLUDED.criticality,
      last_updated = EXCLUDED.last_updated,
      updated_at = NOW();

INSERT INTO public.dependencies (
      id, source_id, target_id, type, description, criticality, last_updated
    ) VALUES (
      '1755180786056',
      '1755175825189',
      '1755174959704',
      'uses',
      '',
      'critical',
      '2025-08-15T08:16:51.245Z'
    ) ON CONFLICT (id) DO UPDATE SET
      source_id = EXCLUDED.source_id,
      target_id = EXCLUDED.target_id,
      type = EXCLUDED.type,
      description = EXCLUDED.description,
      criticality = EXCLUDED.criticality,
      last_updated = EXCLUDED.last_updated,
      updated_at = NOW();

INSERT INTO public.dependencies (
      id, source_id, target_id, type, description, criticality, last_updated
    ) VALUES (
      '1755180797209',
      '1755175825189',
      '1755175241241',
      'uses',
      '',
      'critical',
      '2025-08-15T08:16:51.245Z'
    ) ON CONFLICT (id) DO UPDATE SET
      source_id = EXCLUDED.source_id,
      target_id = EXCLUDED.target_id,
      type = EXCLUDED.type,
      description = EXCLUDED.description,
      criticality = EXCLUDED.criticality,
      last_updated = EXCLUDED.last_updated,
      updated_at = NOW();

INSERT INTO public.dependencies (
      id, source_id, target_id, type, description, criticality, last_updated
    ) VALUES (
      '1755180819425',
      '1755175825189',
      '1755175408652',
      'uses',
      '',
      'critical',
      '2025-08-15T08:16:51.245Z'
    ) ON CONFLICT (id) DO UPDATE SET
      source_id = EXCLUDED.source_id,
      target_id = EXCLUDED.target_id,
      type = EXCLUDED.type,
      description = EXCLUDED.description,
      criticality = EXCLUDED.criticality,
      last_updated = EXCLUDED.last_updated,
      updated_at = NOW();

INSERT INTO public.dependencies (
      id, source_id, target_id, type, description, criticality, last_updated
    ) VALUES (
      '1755180952466',
      '1755180931837',
      '1755175825189',
      'requires',
      '',
      'critical',
      '2025-08-15T08:16:51.245Z'
    ) ON CONFLICT (id) DO UPDATE SET
      source_id = EXCLUDED.source_id,
      target_id = EXCLUDED.target_id,
      type = EXCLUDED.type,
      description = EXCLUDED.description,
      criticality = EXCLUDED.criticality,
      last_updated = EXCLUDED.last_updated,
      updated_at = NOW();

