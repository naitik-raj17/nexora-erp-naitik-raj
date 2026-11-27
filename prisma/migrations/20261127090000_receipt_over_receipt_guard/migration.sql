-- NFR-03: the database blocks over-receipt. A receipt line may not take the total received
-- for a PO line above the ordered quantity. The PO line row is locked first, so two
-- concurrent receipts for the same line are checked one after the other.
CREATE FUNCTION check_goods_receipt_line_quantity() RETURNS trigger AS $$
DECLARE
  ordered  numeric;
  received numeric;
BEGIN
  SELECT quantity INTO ordered
    FROM purchase_order_lines
   WHERE id = NEW.purchase_order_line_id
     FOR UPDATE;

  SELECT COALESCE(SUM(quantity), 0) INTO received
    FROM goods_receipt_lines
   WHERE purchase_order_line_id = NEW.purchase_order_line_id
     AND id <> NEW.id;

  IF received + NEW.quantity > ordered THEN
    RAISE EXCEPTION 'over-receipt on purchase order line %: ordered %, already received %, new %',
      NEW.purchase_order_line_id, ordered, received, NEW.quantity
      USING ERRCODE = 'check_violation', CONSTRAINT = 'grn_lines_no_over_receipt';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grn_lines_no_over_receipt
  BEFORE INSERT OR UPDATE OF quantity, purchase_order_line_id ON goods_receipt_lines
  FOR EACH ROW EXECUTE FUNCTION check_goods_receipt_line_quantity();
