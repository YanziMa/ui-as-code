/**
 * Internationalization / translations API.
 * GET /api/i18n?locale=en
 */

import { NextResponse } from "next/server";

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_frictions: "Frictions",
    nav_prs: "Pull Requests",
    nav_analytics: "Analytics",
    nav_settings: "Settings",
    // Common
    common_save: "Save",
    common_cancel: "Cancel",
    common_delete: "Delete",
    common_edit: "Edit",
    common_create: "Create",
    common_search: "Search...",
    common_loading: "Loading...",
    common_error: "Something went wrong",
    common_retry: "Try again",
    // Frictions
    friction_new: "New Friction",
    friction_list: "All Frictions",
    friction_status_open: "Open",
    friction_status_resolved: "Resolved",
    friction_status_in_progress: "In Progress",
    // PRs
    pr_new: "New PR",
    pr_accepted: "Accepted",
    pr_rejected: "Rejected",
    pr_pending: "Pending Review",
    pr_under_review: "Under Review",
    // Auth
    auth_login: "Log In",
    auth_signup: "Sign Up",
    auth_logout: "Log Out",
    auth_forgot_password: "Forgot password?",
  },
  zh: {
    nav_dashboard: "仪表盘",
    nav_frictions: "痛点记录",
    nav_prs: "拉取请求",
    nav_analytics: "数据分析",
    nav_settings: "设置",
    common_save: "保存",
    common_cancel: "取消",
    common_delete: "删除",
    common_edit: "编辑",
    common_create: "创建",
    common_search: "搜索...",
    common_loading: "加载中...",
    common_error: "出了点问题",
    common_retry: "重试",
    friction_new: "新建痛点",
    friction_list: "所有痛点",
    friction_status_open: "开放中",
    friction_status_resolved: "已解决",
    friction_status_in_progress: "处理中",
    pr_new: "新建 PR",
    pr_accepted: "已采纳",
    pr_rejected: "已拒绝",
    pr_pending: "待审核",
    pr_under_review: "审核中",
    auth_login: "登录",
    auth_signup: "注册",
    auth_logout: "退出登录",
    auth_forgot_password: "忘记密码？",
  },
  ja: {
    nav_dashboard: "ダッシュボード",
    nav_frictions: "摩擦ポイント",
    nav_prs: "プルリクエスト",
    nav_analytics: "分析",
    nav_settings: "設定",
    common_save: "保存",
    common_cancel: "キャンセル",
    common_delete: "削除",
    common_edit: "編集",
    common_create: "作成",
    common_search: "検索...",
    common_loading: "読み込み中...",
    common_error: "エラーが発生しました",
    common_retry: "再試行",
    friction_new: "新規摩擦ポイント",
    friction_list: "全ての摩擦ポイント",
    friction_status_open: "オープン",
    friction_status_resolved: "解決済み",
    friction_status_in_progress: "進行中",
    pr_new: "新規PR",
    pr_accepted: "承認済み",
    pr_rejected: "拒否済み",
    pr_pending: "レビュー待ち",
    pr_under_review: "レビュー中",
    auth_login: "ログイン",
    auth_signup: "新規登録",
    auth_logout: "ログアウト",
    auth_forgot_password: "パスワードをお忘れですか？",
  },
};

const SUPPORTED_LOCALES = ["en", "zh", "ja"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "en";

  if (!SUPPORTED_LOCALES.includes(locale)) {
    return NextResponse.json(
      { error: `Unsupported locale. Supported: ${SUPPORTED_LOCALES.join(", ")}` },
      { status: 400 },
    );
  }

  return NextResponse.json({
    locale,
    translations: TRANSLATIONS[locale] || TRANSLATIONS.en,
    supportedLocales: SUPPORTED_LOCALES,
  });
}
