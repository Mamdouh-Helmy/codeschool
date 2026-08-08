"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Award, Building2, Calendar, ExternalLink, ShieldCheck } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "../ui/dialog";
import type { CertificateItem } from "@/types/portfolio";

function formatIssueDate(date?: string | Date | null) {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
    }).format(d);
}

const containerVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const Certificates = ({
    certificates,
}: {
    certificates: CertificateItem[];
}) => {
    const [active, setActive] = useState<CertificateItem | null>(null);

    if (!certificates || certificates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-[#232329]">
                    <div className="absolute inset-0 rounded-full border border-dashed border-accent/30" />
                    <Award className="h-7 w-7 text-accent" />
                </div>
                <div className="flex flex-col gap-1">
                    <h4 className="text-lg font-semibold">No certificates yet</h4>
                    <p className="max-w-[320px] text-secondary/60 dark:text-white/60">
                        Certifications and credentials will show up here once added.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <motion.ul
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-[30px]"
            >
                {certificates.map((cert) => (
                    <motion.li key={cert.id} variants={cardVariants}>
                        <button
                            type="button"
                            onClick={() => setActive(cert)}
                            className="group relative w-full overflow-hidden rounded-2xl border border-black/5 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/30 hover:shadow-2xl hover:shadow-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/10 dark:bg-[#1c1c21]"
                        >
                            {/* top accent bar */}
                            <div className="h-1 w-full bg-gradient-to-r from-accent/40 via-accent to-accent/40" />

                            <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 dark:bg-[#141417]">
                                {cert.imageUrl ? (
                                    <img
                                        src={cert.imageUrl}
                                        alt={cert.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Award className="h-10 w-10 text-accent/40" />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <div className="absolute inset-0 flex translate-y-2 items-end justify-center pb-5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg">
                                        View certificate
                                        <ExternalLink className="h-3 w-3" />
                                    </span>
                                </div>
                            </div>

                            {/* seal — sits on the image/body seam like a wax stamp */}
                            <div className="relative z-10 -mt-6 flex justify-end pr-5">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-accent shadow-lg dark:border-[#1c1c21]">
                                    <ShieldCheck className="h-5 w-5 text-white" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5 px-5 pb-5 pt-1">
                                <h4 className="line-clamp-2 min-h-[48px] text-[15px] font-bold leading-snug tracking-tight">
                                    {cert.title}
                                </h4>

                                <div className="h-px w-full bg-gradient-to-r from-black/10 to-transparent dark:from-white/10" />

                                <div className="flex items-center justify-between gap-2 text-xs font-medium text-secondary/60 dark:text-white/50">
                                    <span className="flex min-w-0 items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                                        <span className="truncate">{cert.issuer || "—"}</span>
                                    </span>
                                    {formatIssueDate(cert.issueDate) && (
                                        <span className="flex shrink-0 items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {formatIssueDate(cert.issueDate)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    </motion.li>
                ))}
            </motion.ul>

            <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
                <DialogContent className="p-0 overflow-hidden">
                    {active && (
                        <div className="flex flex-col">
                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50 dark:bg-[#141417]">
                                {active.imageUrl ? (
                                    <img
                                        src={active.imageUrl}
                                        alt={active.title}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Award className="h-12 w-12 text-accent/40" />
                                    </div>
                                )}
                                <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-accent shadow-lg ring-4 ring-white/80 dark:ring-black/40">
                                    <ShieldCheck className="h-5 w-5 text-white" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 p-6">
                                <div className="flex flex-col gap-1.5">
                                    <DialogTitle className="text-2xl leading-snug">{active.title}</DialogTitle>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {active.issuer && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                                                <Building2 className="h-3.5 w-3.5" />
                                                {active.issuer}
                                            </span>
                                        )}
                                        {formatIssueDate(active.issueDate) && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-secondary/70 dark:bg-white/10 dark:text-white/60">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatIssueDate(active.issueDate)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {active.description && (
                                    <DialogDescription>{active.description}</DialogDescription>
                                )}

                                {active.credentialUrl && (
                                    <a
                                        href={active.credentialUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition-transform hover:scale-[1.03] hover:opacity-95"
                                    >
                                        Verify credential
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Certificates;