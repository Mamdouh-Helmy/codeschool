"use client";
// src/app/components/icons.jsx
//
// طبقة أيقونات موحّدة مبنية على Phosphor Icons (duotone).
// الأسماء هنا هي نفس أسماء lucide اللي كانت مستخدمة في الصفحتين،
// فكل اللي هتعمله إنك تغيّر مسار الـ import من "lucide-react" إلى "@/app/components/icons"
// وكل الأيقونات في الصفحة بتتبدّل مرة واحدة.
//
// التنصيب:  npm i @phosphor-icons/react
// (اختياري في next.config.js)  experimental: { optimizePackageImports: ["@phosphor-icons/react"] }

import React from "react";
import {
  ArrowCircleRightIcon, ArrowCounterClockwiseIcon, ArrowSquareOutIcon, ArrowsClockwiseIcon,
  BookOpenTextIcon, BookmarksIcon, BrainIcon, BriefcaseIcon,
  CalendarBlankIcon, CalendarCheckIcon, CalendarDotsIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon,
  ChartBarIcon, ChatCircleDotsIcon, ChatTeardropTextIcon, ChatsCircleIcon, CheckCircleIcon, CheckIcon,
  ChecksIcon, ClipboardTextIcon, ClockIcon, CopyIcon, EyeIcon, EyeSlashIcon, FileTextIcon,
  FolderOpenIcon, FunnelIcon, GiftIcon, GlobeHemisphereWestIcon, GraduationCapIcon, HourglassMediumIcon,
  InfoIcon, LightningIcon, LinkSimpleIcon, ListChecksIcon, LockKeyIcon, MagnifyingGlassIcon, MapPinIcon,
  MedalIcon, NavigationArrowIcon, PaperPlaneTiltIcon, PauseCircleIcon, PencilSimpleLineIcon, PlayIcon,
  PresentationChartIcon, RepeatIcon, SealCheckIcon, SealQuestionIcon, SealWarningIcon, ShieldCheckIcon,
  SkipForwardIcon, SparkleIcon, SpinnerGapIcon, SquaresFourIcon, StackIcon, StarIcon, TargetIcon,
  TimerIcon, TrendUpIcon, UserCheckIcon, UserCircleIcon, UsersThreeIcon, VideoCameraIcon,
  WarningCircleIcon, XIcon,
} from "@phosphor-icons/react";

const make = (Icon, defaultWeight = "duotone") =>
  React.forwardRef(function PhIcon({ weight = defaultWeight, ...props }, ref) {
    return <Icon ref={ref} weight={weight} {...props} />;
  });

// ── أيقونات صغيرة/وظيفية → bold عشان تبان واضحة ──
export const X = make(XIcon, "bold");
export const Check = make(CheckIcon, "bold");
export const CheckCheck = make(ChecksIcon, "bold");
export const ChevronRight = make(CaretRightIcon, "bold");
export const ChevronLeft = make(CaretLeftIcon, "bold");
export const ChevronDown = make(CaretDownIcon, "bold");
export const Loader2 = make(SpinnerGapIcon, "bold");

// ── باقي الأيقونات → duotone ──
export const AlertCircle = make(WarningCircleIcon);
export const ArrowRightCircle = make(ArrowCircleRightIcon);
export const Award = make(MedalIcon);
export const BadgeAlert = make(SealWarningIcon);
export const BadgeCheck = make(SealCheckIcon);
export const BarChart3 = make(ChartBarIcon);
export const BookMarked = make(BookmarksIcon);
export const BookOpen = make(BookOpenTextIcon);
export const Briefcase = make(BriefcaseIcon);
export const Calendar = make(CalendarBlankIcon);
export const CalendarClock = make(CalendarCheckIcon);
export const CalendarDays = make(CalendarDotsIcon);
export const CheckCircle = make(CheckCircleIcon);
export const CheckCircle2 = make(CheckCircleIcon);
export const Clock = make(ClockIcon);
export const ClipboardList = make(ClipboardTextIcon);
export const Copy = make(CopyIcon);
export const ExternalLink = make(ArrowSquareOutIcon);
export const Eye = make(EyeIcon);
export const EyeOff = make(EyeSlashIcon);
export const FileText = make(FileTextIcon);
export const FolderOpen = make(FolderOpenIcon);
export const Gift = make(GiftIcon);
export const Globe = make(GlobeHemisphereWestIcon);
export const GraduationCap = make(GraduationCapIcon);
export const Hourglass = make(HourglassMediumIcon);
export const Info = make(InfoIcon);
export const Layers = make(StackIcon);
export const LayoutGrid = make(SquaresFourIcon);
export const Link2 = make(LinkSimpleIcon);
export const ListFilter = make(FunnelIcon);
export const Lock = make(LockKeyIcon);
export const MapPin = make(MapPinIcon);
export const MessageSquarePlus = make(ChatTeardropTextIcon);
export const MessageSquareWarning = make(ChatCircleDotsIcon);
export const Navigation = make(NavigationArrowIcon);
export const PauseCircle = make(PauseCircleIcon);
export const Pencil = make(PencilSimpleLineIcon);
export const Play = make(PlayIcon);
export const Presentation = make(PresentationChartIcon);
export const RefreshCw = make(ArrowsClockwiseIcon);
export const Repeat = make(RepeatIcon);
export const RotateCcw = make(ArrowCounterClockwiseIcon);
export const Search = make(MagnifyingGlassIcon);
export const Send = make(PaperPlaneTiltIcon);
export const Shield = make(ShieldCheckIcon);
export const SkipForward = make(SkipForwardIcon);
export const Sparkles = make(SparkleIcon);
export const Star = make(StarIcon);
export const Timer = make(TimerIcon);
export const TrendingUp = make(TrendUpIcon);
export const User = make(UserCircleIcon);
export const UserCheck = make(UserCheckIcon);
export const Users = make(UsersThreeIcon);
export const Video = make(VideoCameraIcon);
export const Zap = make(LightningIcon);

// ── أيقونات جديدة بأسماء Phosphor (للتصميم الجديد) ──
export const PaperPlaneTilt = make(PaperPlaneTiltIcon);
export const SealCheck = make(SealCheckIcon);
export const SealQuestion = make(SealQuestionIcon);
export const ArrowsClockwise = make(ArrowsClockwiseIcon);
export const Target = make(TargetIcon);
export const Brain = make(BrainIcon);
export const ListChecks = make(ListChecksIcon);
export const ChatsCircle = make(ChatsCircleIcon);