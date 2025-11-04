#!/usr/bin/env python3
import csv, sys, os
from datetime import datetime
from supabase import create_client

def parse_dt(s):
    if not s or not s.strip(): return None
    try: return datetime.strptime(s, '%Y-%m-%d %H:%M:%S').isoformat()
    except: return None

csv_path = sys.argv[1] if len(sys.argv) > 1 else None
if not csv_path or not os.path.exists(csv_path):
    print("Usage: python3 import-sumsub-csv.py <csv_file>"); sys.exit(1)

sb = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
imported, skipped, errors = 0, 0, 0

with open(csv_path, 'r', encoding='utf-8') as f:
    for row in csv.DictReader(f, delimiter=';'):
        try:
            if row['reviewResult'] != 'completed' or not parse_dt(row['reviewedAt']):
                skipped += 1; continue
            sb.table('onboarding_notifications').upsert({
                'applicant_id': row['applicantId'],
                'external_user_id': row['externalUserId'],
                'name': row['companyName'],
                'email': row['email'],
                'document': row['externalUserId'].replace('cnpj_', '').replace('unil-', ''),
                'verification_type': 'company',
                'review_answer': 'GREEN' if row['reviewStatus'] == 'GREEN' else 'RED',
                'level_name': row['levelName'],
                'created_at': parse_dt(row['createdAt']),
                'reviewed_at': parse_dt(row['reviewedAt']),
                'payload': {'country': row['country'], 'phone': row['phone'], 'platform': row['applicantPlatform'], 'imported_from_csv': True}
            }, on_conflict='applicant_id').execute()
            imported += 1
            print(f"✅ {row['companyName']}")
        except Exception as e:
            errors += 1
            print(f"❌ Error: {e}")

print(f"\n📊 Imported: {imported} | Skipped: {skipped} | Errors: {errors}")
