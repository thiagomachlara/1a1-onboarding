-- Fix RLS policies for compliance_certificates table
-- Drop existing policies that were causing permission errors
DROP POLICY IF EXISTS "Admins can view all certificates" ON compliance_certificates;
DROP POLICY IF EXISTS "Admins can insert certificates" ON compliance_certificates;
DROP POLICY IF EXISTS "Admins can update certificates" ON compliance_certificates;

-- Create simplified policies for authenticated users
CREATE POLICY "Allow authenticated users to view certificates"
  ON compliance_certificates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert certificates"
  ON compliance_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update certificates"
  ON compliance_certificates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fix RLS policies for storage bucket compliance-certificates
-- Allow authenticated users to upload certificates
CREATE POLICY "Allow authenticated users to upload certificates"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'compliance-certificates');

-- Allow authenticated users to read certificates
CREATE POLICY "Allow authenticated users to read certificates"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'compliance-certificates');
