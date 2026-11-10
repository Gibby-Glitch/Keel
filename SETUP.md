# Setting up accounts and sharing

Keel runs in two modes:

- **On-device mode** (no setup): one person, data stays in the browser. This is what you get with no environment variables.
- **Account mode** (this guide, ~15 minutes): each person signs in to a private account, data syncs across their devices, and partners can send each other journal entries.

You'll need free accounts on **GitHub**, **Supabase** and **Vercel**.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name (e.g. `keel`), a strong database password, and the region closest to you (e.g. US Central/East).
2. When it finishes, open **SQL Editor → New query**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. You should see “Success. No rows returned.”
3. Open **Project Settings → API** (or the **Connect** button) and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Never use the `service_role` / secret key in this app.

## 2. Deploy on Vercel

1. Push this folder to a GitHub repository (private is fine).
2. At [vercel.com/new](https://vercel.com/new), import the repo.
3. Before clicking Deploy, open **Environment Variables** and add the two values from step 1.3.
4. Deploy. Note your site address, e.g. `https://keel-yourname.vercel.app`.

## 3. Point Supabase sign-in emails at your site

In Supabase → **Authentication → URL Configuration**:

- **Site URL**: your Vercel address (`https://keel-yourname.vercel.app`)
- **Redirect URLs**: add the same address, plus `http://localhost:3000` for local testing

This makes confirmation and password-reset links open your app.

## 4. Create your accounts and link up

1. You: open the site, **Create an account**, confirm your email, sign in, set up your plan.
2. Your wife: same thing, on her own phone or computer, with her own email.
3. One of you: **Shared → Link with your partner**, enter the other's email, **Send invite**.
4. The other: open **Shared** (or Today — a banner appears) and **Accept**.

Now every journal entry has a **Send to [name]** button. The other person gets it in their Shared inbox, can reply, and you'll see when it's been read.

### Add it to your phone's home screen

Open the site in Safari (iPhone) → Share → **Add to Home Screen**, or Chrome (Android) → ⋮ → **Install app**. It opens full-screen like a normal app.

## What's private and what's shared

| Data | Who can see it |
|---|---|
| Your journal, habits, slips, savings, urges, plans, pause list | Only you |
| An entry you choose to **send** | You and your partner (they get a copy) |
| Your partner's reply to an entry you sent | You and your partner |
| Your name and email | You, and anyone you've linked with or invited |

This is enforced by row-level security in the database, not just by the app. Even with the public key, one account cannot read another's data.

- **Unsend** removes an entry from your partner's inbox; it stays in your journal.
- **Unlink** stops future sharing; entries already sent stay where they are.
- Deleting an entry from your journal doesn't unsend copies you've already sent — unsend those from Shared → Sent by you.

## Notes on the free tiers

- Supabase's built-in email service sends only a small number of auth emails per hour — plenty for two people. If you hit the limit, wait an hour, or add your own SMTP under Authentication → Emails.
- Free Supabase projects can be paused after a period of inactivity. If the app says “Offline” after a long break, open the Supabase dashboard and restore the project. Your data is kept.
- To turn off email confirmation (faster sign-up), Authentication → Sign In / Providers → Email → disable **Confirm email**.

## Running locally in account mode

```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```
