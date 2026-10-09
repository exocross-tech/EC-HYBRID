"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Share2,
  Send,
  CheckCircle2,
  Clock,
  ThumbsUp,
  MessageCircle,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  TrendingUp,
  Globe,
  Radio,
  X
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatDateTime } from "@/lib/formatDate";

interface SocialPost {
  id: string;
  platform: "LINKEDIN" | "X" | "FACEBOOK" | "INSTAGRAM";
  content: string;
  mediaUrl: string | null;
  scheduledFor: string | null;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  publishedAt: string | null;
  likes: number;
  shares: number;
  clicks: number;
  createdAt: string;
}

interface SocialStats {
  total: number;
  publishedCount: number;
  scheduledCount: number;
  draftsCount: number;
  totalLikes: number;
  totalShares: number;
  totalClicks: number;
  estimatedReach: number;
}

const PLATFORMS = [
  { id: "LINKEDIN", name: "LinkedIn", color: "bg-blue-600 text-white", border: "border-blue-200" },
  { id: "X", name: "X (Twitter)", color: "bg-slate-900 text-white", border: "border-slate-800" },
  { id: "INSTAGRAM", name: "Instagram", color: "bg-pink-600 text-white", border: "border-pink-200" },
  { id: "FACEBOOK", name: "Facebook", color: "bg-indigo-600 text-white", border: "border-indigo-200" },
];

export default function SocialPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter
  const [activeTab, setActiveTab] = useState<"ALL" | "PUBLISHED" | "SCHEDULED" | "DRAFT">("ALL");

  // Post Composer State
  const [selectedPlatform, setSelectedPlatform] = useState<"LINKEDIN" | "X" | "FACEBOOK" | "INSTAGRAM">("LINKEDIN");
  const [postContent, setPostContent] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [submitting, setSubmitting] = useState(false);

  // Fetch posts
  const fetchPosts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/social");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setStats(data.stats || null);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to load social posts");
      }
    } catch {
      setErrorMsg("Network error loading social feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  // Handle Post Creation
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          content: postContent,
          scheduledFor: isScheduled ? scheduleDateTime : null,
          status: isScheduled ? "SCHEDULED" : "PUBLISHED",
        }),
      });

      if (res.ok) {
        setSuccessMsg(
          isScheduled
            ? `Post scheduled for ${new Date(scheduleDateTime).toLocaleString()}`
            : "Post published across simulated marketing channel!"
        );
        setPostContent("");
        setIsScheduled(false);
        fetchPosts();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to create post");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send post");
    } finally {
      setSubmitting(false);
    }
  };

  // Publish Now action for scheduled posts
  const handlePublishNow = async (id: string) => {
    try {
      const res = await fetch(`/api/social/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (res.ok) {
        setSuccessMsg("Scheduled post broadcasted live!");
        fetchPosts();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      setErrorMsg("Failed to broadcast post");
    }
  };

  // Delete post
  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/social/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("Post deleted");
        fetchPosts();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      setErrorMsg("Failed to delete post");
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (activeTab === "ALL") return true;
    return p.status === activeTab;
  });

  return (
    <AppLayout
      title="Social Media & Marketing Hub"
      subtitle="Multi-channel campaign simulation, live post broadcasting, and automated engagement analytics (Phase 4)"
    >
      {/* Alert Messages */}
      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium shadow-xs">
          <X className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Marketing KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Estimated Reach</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {(stats?.estimatedReach || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-indigo-600 mt-1 font-medium">Aggregated impressions</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Live Published</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{stats?.publishedCount || 0}</p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">Active broadcasts</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Scheduled Queue</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{stats?.scheduledCount || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Awaiting release</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Engagements</span>
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <ThumbsUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {((stats?.totalLikes || 0) + (stats?.totalShares || 0) + (stats?.totalClicks || 0)).toLocaleString()}
          </p>
          <p className="text-[11px] text-pink-600 mt-1 font-medium">
            {stats?.totalLikes || 0} likes &bull; {stats?.totalShares || 0} shares
          </p>
        </div>
      </div>

      {/* Main Grid: Composer on Left, Feed on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Post Composer */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Compose Campaign Post
                </h3>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                Sandbox Mode
              </span>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              {/* Channel Selector */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Select Channel</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                  {PLATFORMS.map((plat) => (
                    <button
                      key={plat.id}
                      type="button"
                      onClick={() => setSelectedPlatform(plat.id as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedPlatform === plat.id
                          ? `${plat.color} border-transparent shadow-xs`
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{plat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Post Content Input */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 flex justify-between">
                  <span>Post Content</span>
                  <span className="text-[10px] text-slate-400">{postContent.length} chars</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share exciting company news, project milestones, or technology insights..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium text-xs leading-relaxed"
                />
              </div>

              {/* Schedule Toggle */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800 text-xs">Schedule for later</span>
                </label>

                {isScheduled && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-slate-500 text-[11px] mb-1">Target Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={(e) => setScheduleDateTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !postContent.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : isScheduled ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Queue Scheduled Post</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Now</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Connected Channels Health */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Connected Social Channels</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-800">LinkedIn Corporate Page</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                  Synced (Live)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-800">X (Twitter) @echybrid</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                  Synced (Live)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-800">Instagram @echybrid.io</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                  Synced (Live)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Posts Feed & Queue */}
        <div className="lg:col-span-7 space-y-4">
          {/* Feed Filter Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              {(["ALL", "PUBLISHED", "SCHEDULED", "DRAFT"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === tab
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab === "ALL" ? "All Posts" : tab}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={fetchPosts}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                title="Refresh feed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <span>Loading marketing feed...</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                <Share2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700">No posts in this category</p>
                <p className="text-xs text-slate-400 mt-1">
                  Use the composer on the left to broadcast your first campaign update.
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const platMeta = PLATFORMS.find((p) => p.id === post.platform) || PLATFORMS[0];
                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${platMeta.color}`}>
                          {platMeta.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {post.publishedAt
                            ? `Published on ${formatDate(post.publishedAt)}`
                            : post.scheduledFor
                            ? `Scheduled for ${formatDateTime(post.scheduledFor)}`
                            : "Draft"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            post.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : post.status === "SCHEDULED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {post.status}
                        </span>

                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {/* Footer & Engagement Stats */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {post.status === "PUBLISHED" ? (
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
                            <span>{post.likes}</span>
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{post.shares}</span>
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{post.clicks} clicks</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Engagement metrics populate on broadcast
                        </span>
                      )}

                      {post.status !== "PUBLISHED" && (
                        <button
                          onClick={() => handlePublishNow(post.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>Publish Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
