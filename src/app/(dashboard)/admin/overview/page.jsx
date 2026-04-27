// app/(dashboard)/overview/page.jsx
import OverviewDashboard from "@/components/Admin/OverviewDashboard";

export const metadata = {
  title: "نظرة عامة — المدرسون والطلاب",
  description: "متابعة ساعات المدرسين وأرصدة الطلاب",
};

export default function OverviewPage() {
  return <OverviewDashboard />;
}