-- Grants required by the Android social features.
-- Row-level security remains enabled; these grants do not bypass RLS.
REVOKE ALL PRIVILEGES ON TABLE public.comments, public.friend_requests, public.messages, public.notifications, public.post_shares, public.reports FROM anon;
REVOKE REFERENCES, TRIGGER, TRUNCATE ON TABLE public.comments, public.friend_requests, public.messages, public.notifications, public.post_shares, public.reports FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.friend_requests TO authenticated;
GRANT SELECT, INSERT ON TABLE public.messages TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT ON TABLE public.post_shares TO authenticated;
GRANT INSERT ON TABLE public.reports TO authenticated;
