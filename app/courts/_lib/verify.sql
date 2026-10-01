-- TEST database only, after upgrade-admin-overrides.sql. Rolls back all test data.
begin;
do $$
declare s uuid; s2 uuid; s3 uuid; b uuid; batch uuid; ta uuid; r uuid;
begin
 insert into knocklyon_teams(name,captain_name,captain_email,access_token) values('Court Test A','A','a@example.test','test-a') returning id into ta;
 insert into knocklyon_teams(name,captain_name,captain_email,access_token) values('Court Test B','B','b@example.test','test-b');
 s:=court_create_draft(current_date+100,'Court 1','18:00','19:00');
 s2:=court_create_draft(current_date+100,'Court 2','18:00','19:00');
 select release_id into r from court_slots where id=s;
 if exists(select 1 from court_slots where id=s and (published_at is not null or notification_batch_id is not null)) then raise exception 'Draft was published'; end if;
 begin
  perform court_book('test-a',s);
  raise exception 'TEST FAILED: draft bookable';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 batch:=court_release_drafts();
 if (select count(*) from court_batch_notifications where batch_id=batch and team_id=ta)<>1 then raise exception 'Expected one notification for multiple slots'; end if;
 if court_release_drafts() is not null then raise exception 'Duplicate release created'; end if;
 s3:=court_create_draft(current_date+100,'Court 3','18:00','19:00');
 begin
  perform court_book('test-a',s3);
  raise exception 'TEST FAILED: new draft on released date bookable';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 begin
  perform court_create_draft(current_date+100,'Court 1','18:30','19:30');
  raise exception 'TEST FAILED: overlapping slot';
 exception when exclusion_violation then null; end;
 b:=court_book('test-a',s);
 begin
  perform court_book('test-a',s2);
  raise exception 'TEST FAILED: daily limit';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 begin
  perform court_book('test-b',s);
  raise exception 'TEST FAILED: double booking';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 begin
  perform court_cancel('test-b',b);
  raise exception 'TEST FAILED: ownership';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 perform court_cancel('test-a',b);
 perform court_book('test-b',s);
 update court_slots set starts_at=now()-interval '1 minute',ends_at=now()+interval '59 minutes' where id=s2;
 begin
  perform court_book('test-a',s2);
  raise exception 'TEST FAILED: expired slot bookable';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 perform court_release_drafts();
 update court_releases set closed=true where id=r;
 begin
  perform court_book('test-a',s3);
  raise exception 'TEST FAILED: closed release';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
end $$;
do $$
declare s uuid; b uuid;
begin
 s:=court_create_draft(current_date+101,'Court 1','18:00','19:00');
 perform court_release_drafts();
 perform court_edit_slot(s,current_date+101,'Court 2','19:00','20:00');
 if exists(select 1 from court_slots where id=s and published_at is not null) then raise exception 'Edited slot should be a draft'; end if;
 begin
  perform court_book('test-a',s);
  raise exception 'TEST FAILED: edited draft bookable';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 perform court_release_drafts();
 b:=court_book('test-a',s);
 begin
  perform court_delete_slot(s);
  raise exception 'TEST FAILED: booked slot deleted';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 begin
  perform court_edit_slot(s,current_date+101,'Court 3','19:00','20:00');
  raise exception 'TEST FAILED: booked slot edited';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 perform court_cancel('test-a',b);
 perform court_delete_slot(s);
 begin
  perform court_book('test-b',s);
  raise exception 'TEST FAILED: deleted slot bookable';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 -- A deleted slot no longer blocks that court and time.
 perform court_create_draft(current_date+101,'Court 2','19:00','20:00');
 if not exists(select 1 from court_bookings where id=b) then raise exception 'Lost booking history'; end if;
end $$;
do $$
declare s uuid; b uuid; event_id uuid; dest uuid; other uuid;
begin
 s:=court_create_draft(current_date+102,'Court 1','18:00','19:00');
 perform court_release_drafts();
 b:=court_book('test-a',s);
 event_id:=court_admin_edit_slot(s,current_date+103,'Court 2','19:00','20:00');
 select release_id into dest from court_slots where id=s;
 if not exists(select 1 from court_bookings where id=b and release_id=dest and cancelled_at is null) then raise exception 'Reservation lost during move'; end if;
 if not exists(select 1 from court_slots where id=s and published_at is not null) then raise exception 'Booked edit was hidden'; end if;
 if not exists(select 1 from court_booking_changes where id=event_id and kind='updated' and new_slot->>'court'='Court 2' and old_slot->>'court'='Court 1') then raise exception 'Missing update snapshot'; end if;
 other:=court_create_draft(current_date+104,'Court 3','18:00','19:00');
 perform court_release_drafts();
 perform court_book('test-a',other);
 begin
  perform court_admin_edit_slot(s,current_date+104,'Court 2','19:00','20:00');
  raise exception 'TEST FAILED: moved onto team conflict';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 perform court_create_draft(current_date+103,'Court 1','19:00','20:00');
 begin
  perform court_admin_edit_slot(s,current_date+103,'Court 1','19:00','20:00');
  raise exception 'TEST FAILED: moved onto court conflict';
 exception when exclusion_violation then null; end;
 event_id:=court_admin_delete_slot(s);
 if not exists(select 1 from court_bookings where id=b and cancelled_at is not null) then raise exception 'Booking not cancelled'; end if;
 if not exists(select 1 from court_booking_changes where id=event_id and kind='cancelled' and sent_at is null) then raise exception 'Missing cancellation notification'; end if;
 if not exists(select 1 from court_slots where id=s and deleted_at is not null) then raise exception 'Slot not deleted'; end if;
 -- Cancelled history remains and capacity can be reused.
 perform court_create_draft(current_date+103,'Court 2','19:00','20:00');
end $$;
rollback;
