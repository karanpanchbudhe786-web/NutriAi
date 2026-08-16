# 🚀 NutriAI — 24/7 Free Cloud Deployment Guide

This guide walks you through deploying the NutriAI backend to **Render.com** (100% Free Tier) so your backend stays active 24/7 even when your PC is turned off.

---

## 📋 Overview
* **Hosting Platform:** Render.com (Free Web Service)
* **Backend Runtime:** Python 3 + Flask + Gunicorn WSGI
* **Database:** SQLite (persists in cloud) or Supabase PostgreSQL
* **Estimated Setup Time:** ~3 minutes

---

## Step 1: Upload NutriAI to GitHub

1. Create a free account on [GitHub.com](https://github.com/) (if you don't already have one).
2. Click **New Repository** $\rightarrow$ Name it `NutriAI` $\rightarrow$ Set to **Public** or **Private** $\rightarrow$ Click **Create repository**.
3. Push or upload your `NutriAi` project folder to your GitHub repository.

---

## Step 2: Deploy on Render.com (1-Click)

1. Sign up / Log in to [Render.com](https://render.com/) with your GitHub account.
2. Click **New +** $\rightarrow$ Select **Web Service**.
3. Select your `NutriAI` repository from the list.
4. Fill in the deployment details (Render may fill these automatically from `render.yaml`):
   * **Name:** `nutriai-backend`
   * **Region:** Any (e.g., Singapore, Frankfurt, or Oregon)
   * **Branch:** `main` (or `master`)
   * **Runtime:** `Python 3`
   * **Build Command:** `pip install -r backend/requirements.txt`
   * **Start Command:** `gunicorn backend.app:app`
   * **Instance Type:** **Free** ($0.00/month)
5. Under **Environment Variables**, add:
   * `PORT` = `5000`
   * `SECRET_KEY` = (any random string)
   * `GEMINI_API_KEY` = (your Google AI Studio API key, optional)
6. Click **Deploy Web Service**!

---

## Step 3: Connect NutriAI Frontend to your Cloud Backend

1. Once Render finishes building (~1–2 minutes), it will give you a live URL, for example:
   `https://nutriai-backend.onrender.com`
2. Open your NutriAI Web App (`http://localhost:8080/frontend/` or your hosted frontend).
3. Navigate to **Settings ⚙️** $\rightarrow$ **Dedicated Backend API Server**.
4. Paste your live cloud URL:
   `https://nutriai-backend.onrender.com/api`
5. Click **Save & Connect**!

---

## 🎉 You're Done!
Your NutriAI backend is now running **24/7 in the cloud**. You can access it anytime from any computer, tablet, or phone without keeping your PC powered on.
