-- Permet aux leaders de lier leurs propres dons à une remise (UPDATE remittance_id)
CREATE POLICY "Leaders can link own donations to remittance"
  ON donations FOR UPDATE
  TO authenticated
  USING (
    leader_id IN (SELECT id FROM leaders WHERE user_id = auth.uid())
  )
  WITH CHECK (
    leader_id IN (SELECT id FROM leaders WHERE user_id = auth.uid())
  );
