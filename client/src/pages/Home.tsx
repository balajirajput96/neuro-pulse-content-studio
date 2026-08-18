import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { isReelDraftReady } from "@shared/contentModels";
import { Check, CircleAlert, Clock3, FileSearch, KeyRound, Layers3, LockKeyhole, Pause, Play, Plus, RadioTower, ShieldAlert, Sparkles, UploadCloud, Video, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CandidateForm = {
  title: string;
  journal: string;
  doi: string;
  sourceUrl: string;
  populationContext: string;
  contentCategory: "neuroscience" | "psychology" | "diet" | "mental_health";
  studyType: "Human cohort" | "Systematic review" | "Replication study" | "Clinical trial" | "Preclinical model";
};

type ServiceIntegrationCard = {
  id: number | string;
  displayName: string;
  status: string;
  detail: string;
  nextOwnerAction: string | null;
};

type ResearchTriage = {
  label: string;
  value: number;
  detail: string;
  tone: "neutral" | "attention" | "critical";
};

const initialForm: CandidateForm = { title: "", journal: "", doi: "", sourceUrl: "", populationContext: "", contentCategory: "neuroscience", studyType: "Human cohort" };

const keyframeAssets = [
  "/manus-storage/neuroscience_reel_001_clip01_keyframe_518f2ee2.png",
  "/manus-storage/neuroscience_reel_001_clip02_keyframe_66252e35.png",
  "/manus-storage/neuroscience_reel_001_clip03_keyframe_6b370b42.png",
  "/manus-storage/neuroscience_reel_001_clip04_keyframe_aa2897dc.png",
];

const derivedBlockers = [
  { id: "voice", title: "Clean voice sample required", detail: "The current reference contains music rather than clean spoken narration. Upload 60–90 seconds of clear speech to prepare creator-authorized narration.", severity: "critical" as const, icon: Volume2 },
  { id: "quota", title: "Video generation quota reached", detail: "One opening visual clip is prepared. The remaining clip queue is held until the next quota window is available.", severity: "warning" as const, icon: Video },
  { id: "facebook", title: "Facebook Page admin access missing", detail: "No administered Facebook Page is connected yet, so Facebook publishing remains unavailable.", severity: "warning" as const, icon: KeyRound },
];

function StatusPill({ value }: { value: string }) {
  const styles: Record<string, string> = {
    passed: "border-[#b9e1c7] bg-[#e9f7ed] text-[#237044]",
    needs_review: "border-[#f0d7a5] bg-[#fff8e9] text-[#9b6112]",
    rejected: "border-[#ebc4c4] bg-[#fff0f0] text-[#ad3838]",
    approved: "border-[#bdcedf] bg-[#eaf2fb] text-[#315e88]",
    blocked: "border-[#ebc4c4] bg-[#fff0f0] text-[#ad3838]",
    ready_to_compile: "border-[#bdcedf] bg-[#eaf2fb] text-[#315e88]",
    available: "border-[#b9e1c7] bg-[#e9f7ed] text-[#237044]",
    private_only: "border-[#bdcedf] bg-[#eaf2fb] text-[#315e88]",
    needs_owner_login: "border-[#f0d7a5] bg-[#fff8e9] text-[#9b6112]",
    needs_official_credential: "border-[#f0d7a5] bg-[#fff8e9] text-[#9b6112]",
  };
  return <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${styles[value] ?? "border-[#d7d9d5] bg-white text-[#667085]"}`}>{value.replaceAll("_", " ")}</Badge>;
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687076]">{eyebrow}</p>
        <h2 className="mt-1 font-serif text-[27px] font-semibold tracking-[-0.03em] text-[#191c24]">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#687076]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyPanel({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d6d9d4] bg-[#fafaf7] px-6 py-9 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#e8ebe6] text-[#596365]"><Icon className="h-5 w-5" /></div>
      <p className="mt-4 font-medium text-[#2b3035]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#737b7d]">{detail}</p>
    </div>
  );
}

export default function Home() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.workspace.get.useQuery();
  const [form, setForm] = useState<CandidateForm>(initialForm);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [approvalDraftId, setApprovalDraftId] = useState<number | null>(null);
  const addCandidate = trpc.workspace.addStudyCandidate.useMutation({
    onSuccess: result => {
      toast(result.isDuplicate ? "Candidate added with duplicate flag" : "Candidate added to research queue", { description: result.isDuplicate ? "It needs editorial review before becoming a draft." : "Add citation details and screening notes next." });
      setForm(initialForm);
      setCaptureOpen(false);
      utils.workspace.get.invalidate();
    },
    onError: error => toast.error("Candidate could not be added", { description: error.message }),
  });
  const approve = trpc.workspace.approveForPublish.useMutation({
    onSuccess: () => {
      toast("Publishing approval recorded", { description: "No external upload was triggered. This record is now available for a later owner-directed publishing action." });
      setApprovalDraftId(null);
      utils.workspace.get.invalidate();
    },
    onError: error => toast.error("Approval is not available", { description: error.message }),
  });
  const initializeDraft = trpc.workspace.initializeCurrentDraft.useMutation({
    onSuccess: result => {
      toast(result.created ? "Current working draft added" : "Current working draft is already in this workspace", { description: result.created ? "Its source, citation, draft status, weekly bundle, and blockers are now visible below." : "No duplicate source record was created." });
      utils.workspace.get.invalidate();
    },
    onError: error => toast.error("Working draft could not be initialized", { description: error.message }),
  });
  const automation = trpc.automation.get.useQuery();
  const configureSchedules = trpc.automation.configureFreeSchedules.useMutation({
    onSuccess: result => {
      toast("Free schedules configured", { description: `${result.configured.length} recurring workflow${result.configured.length === 1 ? "" : "s"} are now registered. External publishing remains manual.` });
      automation.refetch();
      utils.workspace.get.invalidate();
    },
    onError: error => toast.error("Schedules could not be configured", { description: error.message }),
  });
  const runAutomation = trpc.automation.runNow.useMutation({
    onSuccess: result => {
      toast("Workflow run recorded", { description: result.summary });
      automation.refetch();
      utils.workspace.get.invalidate();
    },
    onError: error => toast.error("Workflow run could not start", { description: error.message }),
  });
  const setScheduleEnabled = trpc.automation.setScheduleEnabled.useMutation({
    onSuccess: result => {
      toast(result.enabled ? "Private schedule resumed" : "Private schedule paused", { description: "This changes only internal research or readiness work. It never affects public publishing." });
      automation.refetch();
      utils.workspace.get.invalidate();
    },
    onError: error => toast.error("Schedule state could not be updated", { description: error.message }),
  });
  const scriptTemplate = trpc.workspace.getHinglishScriptTemplate.useQuery({ topic: "A source-led daily science reel", contentCategory: "neuroscience" });

  const workspace = data ?? { studies: [], drafts: [], citations: [], bundles: [], bundleLinks: [], blockers: [], usedTopics: [], jobs: [], runs: [], integrations: [] };
  const integrations: ServiceIntegrationCard[] = data && "integrations" in data ? data.integrations : [];
  const activeBlockers = workspace.blockers.length ? workspace.blockers.map(b => ({ ...b, id: String(b.id), icon: ShieldAlert })) : derivedBlockers;
  const automationJobs: Array<{
    id: number | string;
    jobType: "daily_research" | "weekly_compilation";
    cronExpression: string;
    lastStatus: string;
    lastSummary: string | null;
    scheduleCronTaskUid: string | null;
    enabled: boolean;
  }> = automation.data?.jobs ?? workspace.jobs;
  const automationRuns = automation.data?.runs ?? workspace.runs ?? [];
  const readyDrafts = workspace.drafts.filter(isReelDraftReady);
  const publishedCount = workspace.drafts.filter(d => d.approvedForPublish).length;
  const draftToApprove = workspace.drafts.find(d => d.id === approvalDraftId);
  const researchTriage: ResearchTriage[] = useMemo(() => [
    {
      label: "Needs evidence review",
      value: workspace.studies.filter(study => study.screeningStatus === "needs_review").length,
      detail: "Source and limitation check is still required.",
      tone: "attention",
    },
    {
      label: "Cross-check pending",
      value: workspace.studies.filter(study => study.crossValidationStatus !== "confirmed").length,
      detail: "Do not promote until supporting context is assessed.",
      tone: "attention",
    },
    {
      label: "High-scrutiny subjects",
      value: workspace.studies.filter(study => study.reviewRisk === "high_scrutiny").length,
      detail: "Diet or Mental Health requires heightened review.",
      tone: "critical",
    },
    {
      label: "Source-ready candidates",
      value: workspace.studies.filter(study => Boolean(study.sourceUrl) && study.screeningStatus === "passed").length,
      detail: "Eligible for a private source-pack review.",
      tone: "neutral",
    },
  ], [workspace.studies]);

  const bundleReadiness = useMemo(() => workspace.bundles.map(bundle => {
    const links = workspace.bundleLinks.filter(link => link.bundleId === bundle.id);
    const completed = links.filter(link => workspace.drafts.find(draft => draft.id === link.reelDraftId && isReelDraftReady(draft))).length;
    return { bundle, linked: links.length, completed, ready: links.length === 7 && completed === 7 };
  }), [workspace.bundles, workspace.bundleLinks, workspace.drafts]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1540px] px-4 py-5 sm:px-7 sm:py-8 lg:px-10">
        <header className="mb-8 border-b border-[#d9ddd6] pb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66706b]"><span className="h-1.5 w-1.5 rounded-full bg-[#a4ce58]" /> Research-to-reel operations</div>
              <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold tracking-[-0.04em] text-[#191c24] sm:text-5xl">A deliberate desk for evidence-led short-form science.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687076]">Review the daily research stream, prepare draft reels, and record only deliberate owner approvals. This workspace contains no automatic publishing trigger.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              {!workspace.studies.length && <Button onClick={() => initializeDraft.mutate()} disabled={initializeDraft.isPending} variant="outline" className="rounded-xl border-[#cfd6ca] bg-white text-[#2a3430] hover:bg-[#f8faf4]"><Sparkles className="mr-2 h-4 w-4 text-[#6c9840]" />{initializeDraft.isPending ? "Preparing draft…" : "Load current working draft"}</Button>}
              <div className="grid grid-cols-3 divide-x divide-[#d9ddd6] rounded-2xl border border-[#d9ddd6] bg-[#fafaf7] px-2 py-3 text-center shadow-[0_8px_24px_rgba(25,28,36,0.04)]">
              <div className="min-w-[92px] px-3"><p className="font-serif text-2xl text-[#191c24]">{workspace.studies.length}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#747b7a]">Studies</p></div>
              <div className="min-w-[92px] px-3"><p className="font-serif text-2xl text-[#191c24]">{readyDrafts.length}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#747b7a]">Ready drafts</p></div>
              <div className="min-w-[92px] px-3"><p className="font-serif text-2xl text-[#191c24]">{publishedCount}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#747b7a]">Approved</p></div>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-[#cfd8c3] bg-[#f5faed] p-4 sm:p-5">
          <div className="flex gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[#4d7524]" />
            <div>
              <p className="text-sm font-semibold text-[#385a1a]">Manual publishing gate is on.</p>
              <p className="mt-1 text-sm leading-6 text-[#58723f]">An approval only records the owner’s decision after every readiness check passes. It does not upload to YouTube, Instagram, or Facebook.</p>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-[#cbd9e9] bg-[#f3f8fc] p-4 sm:p-5" aria-label="Free workflow schedule">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#315e88]" />
              <div>
                <p className="text-sm font-semibold text-[#294c70]">Free periodic workflow</p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#59718a]">Daily PubMed intake runs at 09:00 IST and weekly compilation readiness runs each Sunday at 10:00 IST. Both only update this private workspace; they never generate media, bypass blockers, or publish externally.</p>
              </div>
            </div>
            <Button onClick={() => configureSchedules.mutate()} disabled={configureSchedules.isPending} className="shrink-0 rounded-xl bg-[#315e88] hover:bg-[#294c70]">{configureSchedules.isPending ? "Configuring…" : "Enable free schedules"}</Button>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {(automationJobs.length ? automationJobs : [
              { id: "daily", jobType: "daily_research", cronExpression: "0 30 3 * * *", lastStatus: "idle", lastSummary: "Not configured yet.", scheduleCronTaskUid: null, enabled: true },
              { id: "weekly", jobType: "weekly_compilation", cronExpression: "0 30 4 * * 0", lastStatus: "idle", lastSummary: "Not configured yet.", scheduleCronTaskUid: null, enabled: true },
            ]).map(job => {
              const isDaily = job.jobType === "daily_research";
              return <article key={String(job.id)} className="rounded-xl border border-[#d5e2ed] bg-white/80 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#698097]">{isDaily ? "Daily evidence intake" : "Weekly compilation prep"}</p><p className="mt-1 text-sm font-semibold text-[#31495f]">{isDaily ? "PubMed candidates → review queue" : "Seven-reel readiness → bundle status"}</p></div><StatusPill value={job.lastStatus} /></div><p className="mt-3 font-mono text-[11px] text-[#71879a]">UTC cron: {job.cronExpression}</p><p className="mt-2 min-h-10 text-xs leading-5 text-[#667b8d]">{job.lastSummary || "No run has been recorded yet."}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${job.scheduleCronTaskUid && job.enabled ? "text-[#3e7b4a]" : "text-[#9b6a19]"}`}>{job.scheduleCronTaskUid ? job.enabled ? "Scheduled" : "Paused" : "Awaiting activation"}</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => runAutomation.mutate({ jobType: job.jobType as "daily_research" | "weekly_compilation" })} disabled={runAutomation.isPending || !job.scheduleCronTaskUid || !job.enabled} className="h-8 rounded-lg border-[#bfd0df] bg-white text-[#315e88] hover:bg-[#eaf3fa]">Run now</Button><Button variant="outline" size="sm" onClick={() => setScheduleEnabled.mutate({ jobType: job.jobType as "daily_research" | "weekly_compilation", enabled: !job.enabled })} disabled={setScheduleEnabled.isPending || !job.scheduleCronTaskUid} className="h-8 rounded-lg border-[#d7d9d5] bg-white text-[#596365] hover:bg-[#f5f6f3]">{job.enabled ? <><Pause className="mr-1 h-3.5 w-3.5" />Pause</> : <><Play className="mr-1 h-3.5 w-3.5" />Resume</>}</Button></div></div></article>;
            })}
          </div>
          {automationRuns[0] && <div className="mt-3 rounded-xl border border-[#d7e2eb] bg-white/70 px-3 py-2 text-xs text-[#5f7689]"><span className="font-semibold text-[#405a70]">Private run ledger · </span>{automationRuns[0].sourceSystem || "Neuropulse heartbeat"} — {automationRuns[0].resultSummary}{automationRuns[0].nextOwnerAction ? <span className="block pt-1">Next owner action: {automationRuns[0].nextOwnerAction}</span> : null}</div>}
        </section>

        <section className="mb-12 border-t border-[#d9ddd6] pt-9" aria-label="Private service integration status">
          <SectionHeading eyebrow="00 · Private service ledger" title="Connected is not the same as permitted." detail="This ledger records verified service capability and the next safe action. Every public-submission permission remains disabled by design." />
          {integrations.length ? <div className="grid gap-3 xl:grid-cols-2">{integrations.map(integration => <article key={integration.id} className="rounded-2xl border border-[#d9ddd6] bg-white p-4 shadow-[0_8px_24px_rgba(25,28,36,0.025)]"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0f4f2] text-[#526b61]"><RadioTower className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-[#28312d]">{integration.displayName}</p><p className="mt-1 text-xs leading-5 text-[#687076]">{integration.detail}</p></div></div><StatusPill value={integration.status} /></div><div className="mt-3 rounded-lg bg-[#f7f8f5] px-3 py-2 text-xs leading-5 text-[#65706e]"><span className="font-semibold text-[#45514b]">Next safe step · </span>{integration.nextOwnerAction || "No action is required."}<span className="block pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d4736]">Public submission: disabled</span></div></article>)}</div> : <EmptyPanel icon={RadioTower} title="The private service audit is loading." detail="Verified service capability will appear here without exposing credentials or enabling public delivery." />}
        </section>

        <section className="mb-12" aria-label="Active blockers">
          <div className="mb-4 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[#a44732]" /><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8d4736]">Action-required blockers</p></div>
          <div className="grid gap-3 lg:grid-cols-3">
            {activeBlockers.map(blocker => {
              const Icon = blocker.icon;
              const critical = blocker.severity === "critical";
              return <article key={blocker.id} className={`rounded-2xl border p-4 ${critical ? "border-[#e7c4be] bg-[#fff7f5]" : "border-[#ead9af] bg-[#fffbf1]"}`}>
                <div className="flex items-start gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${critical ? "bg-[#fbe3de] text-[#ae4939]" : "bg-[#fff0cf] text-[#9c6c1a]"}`}><Icon className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-[#292c30]">{blocker.title}</p><p className="mt-1 text-xs leading-5 text-[#6f706e]">{blocker.detail}</p></div></div>
              </article>;
            })}
          </div>
        </section>

        <section id="daily-research" className="scroll-mt-6 border-t border-[#d9ddd6] pt-9">
          <SectionHeading eyebrow="01 · Daily research queue" title="Evidence before aesthetics." detail="Neuroscience and Psychology are permanent priorities. Diet and Mental Health candidates stay in high-scrutiny review until their source, context, and limitation requirements are complete." action={<Dialog open={captureOpen} onOpenChange={setCaptureOpen}><DialogTrigger asChild><Button className="rounded-xl bg-[#202633] px-4 hover:bg-[#303949]"><Plus className="mr-2 h-4" />Add candidate</Button></DialogTrigger><DialogContent className="max-w-xl"><DialogHeader><DialogTitle className="font-serif text-2xl">Add a study candidate</DialogTitle><DialogDescription>Every source is screened for category risk, duplicate topics, population context, and limitation language before it can move to drafting.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={event => { event.preventDefault(); addCandidate.mutate({ ...form, doi: form.doi || undefined, sourceUrl: form.sourceUrl || undefined, populationContext: form.populationContext || undefined }); }}><div className="grid gap-2"><Label htmlFor="study-title">Study title</Label><Input id="study-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter the primary study title" required /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="journal">Journal</Label><Input id="journal" value={form.journal} onChange={e => setForm({ ...form, journal: e.target.value })} placeholder="Journal name" required /></div><div className="grid gap-2"><Label>Editorial category</Label><Select value={form.contentCategory} onValueChange={(value: CandidateForm["contentCategory"]) => setForm({ ...form, contentCategory: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="neuroscience">Neuroscience</SelectItem><SelectItem value="psychology">Psychology</SelectItem><SelectItem value="diet">Diet · high scrutiny</SelectItem><SelectItem value="mental_health">Mental health · high scrutiny</SelectItem></SelectContent></Select></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Study type</Label><Select value={form.studyType} onValueChange={(value: CandidateForm["studyType"]) => setForm({ ...form, studyType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Human cohort">Human cohort</SelectItem><SelectItem value="Systematic review">Systematic review</SelectItem><SelectItem value="Replication study">Replication study</SelectItem><SelectItem value="Clinical trial">Clinical trial</SelectItem><SelectItem value="Preclinical model">Preclinical model</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="doi">DOI or PMID</Label><Input id="doi" value={form.doi} onChange={e => setForm({ ...form, doi: e.target.value })} placeholder="Optional source identifier" /></div></div><div className="grid gap-2"><Label htmlFor="source-url">Primary source URL</Label><Input id="source-url" value={form.sourceUrl} onChange={e => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://pubmed.ncbi.nlm.nih.gov/..." /></div><div className="grid gap-2"><Label htmlFor="population-context">Population or study context</Label><Input id="population-context" value={form.populationContext} onChange={e => setForm({ ...form, populationContext: e.target.value })} placeholder="Required for high-scrutiny Diet and Mental Health items" /></div><DialogFooter><Button type="submit" disabled={addCandidate.isPending}>{addCandidate.isPending ? "Screening…" : "Add to queue"}</Button></DialogFooter></form></DialogContent></Dialog>} />
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Private research triage">
            {researchTriage.map(item => <article key={item.label} className={`rounded-xl border p-4 ${item.tone === "critical" ? "border-[#ecd2ca] bg-[#fff8f5]" : item.tone === "attention" ? "border-[#ead9af] bg-[#fffbf1]" : "border-[#d5e2ed] bg-[#f5f9fc]"}`}><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#737b7d]">{item.label}</p><p className="mt-2 font-serif text-3xl text-[#202633]">{item.value}</p><p className="mt-1 text-xs leading-5 text-[#687076]">{item.detail}</p></article>)}
          </div>
          {scriptTemplate.data ? <article className="mb-5 rounded-2xl border border-[#d6ddd4] bg-[#fbfcf8] p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#607461]">Private Hinglish draft template</p><h3 className="mt-1 font-serif text-xl text-[#202633]">{scriptTemplate.data.title}</h3></div><Badge variant="outline" className="w-fit rounded-full border-[#bfcfbb] bg-white text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4d6b4d]">Owner review required</Badge></div><div className="mt-4 grid gap-2 lg:grid-cols-5">{scriptTemplate.data.sections.map(section => <div key={section.label} className="rounded-xl border border-[#e1e7df] bg-white p-3"><p className="text-xs font-semibold text-[#304033]">{section.label}</p><p className="mt-1 text-xs leading-5 text-[#66706b]">{section.prompt}</p></div>)}</div><p className="mt-4 rounded-xl bg-[#eff5ec] px-3 py-2 text-xs leading-5 text-[#4b624d]"><span className="font-semibold">Safe closing · </span>{scriptTemplate.data.safeClosingLine}</p></article> : null}
          {isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-44 rounded-2xl bg-[#e5e7e2]" />)}</div> : workspace.studies.length ? <div className="grid gap-3 xl:grid-cols-3">{workspace.studies.map(study => <article key={study.id} className="rounded-2xl border border-[#d9ddd6] bg-white p-5 shadow-[0_10px_28px_rgba(25,28,36,0.035)]"><div className="flex items-start justify-between gap-3"><div className="flex flex-wrap gap-2"><StatusPill value={study.screeningStatus} /><Badge variant="outline" className="rounded-full border-[#d7d9d5] bg-[#fafaf7] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5e6964]">{study.contentCategory.replaceAll("_", " ")}</Badge></div>{study.isDuplicate && <Badge className="rounded-full bg-[#fff0ee] text-[10px] font-semibold text-[#a34839] hover:bg-[#fff0ee]">POSSIBLE REPEAT</Badge>}</div><h3 className="mt-4 font-serif text-xl leading-snug text-[#20232b]">{study.title}</h3><dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#eceeea] pt-4 text-xs"><div><dt className="font-semibold uppercase tracking-[0.1em] text-[#8a9191]">Journal</dt><dd className="mt-1 text-[#4f5758]">{study.journal}</dd></div><div><dt className="font-semibold uppercase tracking-[0.1em] text-[#8a9191]">Review level</dt><dd className="mt-1 text-[#4f5758]">{study.reviewRisk.replaceAll("_", " ")}</dd></div><div><dt className="font-semibold uppercase tracking-[0.1em] text-[#8a9191]">Study type</dt><dd className="mt-1 text-[#4f5758]">{study.studyType}</dd></div><div><dt className="font-semibold uppercase tracking-[0.1em] text-[#8a9191]">Cross-check</dt><dd className="mt-1 text-[#4f5758]">{study.crossValidationStatus.replaceAll("_", " ")}</dd></div><div className="col-span-2"><dt className="font-semibold uppercase tracking-[0.1em] text-[#8a9191]">DOI / PMID</dt><dd className="mt-1 break-all font-mono text-[11px] text-[#4f5758]">{study.doi || study.pmid || "Identifier pending"}</dd></div></dl>{study.sourceUrl && <a href={study.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-medium text-[#315e88] underline underline-offset-4">Open primary source</a>}<div className="mt-4 rounded-xl bg-[#f6f7f4] px-3 py-2.5 text-xs leading-5 text-[#66706b]"><span className="font-semibold text-[#404845]">Screening note · </span>{study.screeningReason || "No screening note recorded."}{study.populationContext ? <span className="block pt-2"><span className="font-semibold text-[#404845]">Context · </span>{study.populationContext}</span> : null}</div></article>)}</div> : <EmptyPanel icon={FileSearch} title="The research queue is clear." detail="Add an evidence-screened study candidate to start a source trail, duplicate check, and editorial screen." />}
        </section>

        <section id="draft-reels" className="scroll-mt-6 border-t border-[#d9ddd6] pt-12">
          <SectionHeading eyebrow="02 · Draft reel queue" title="Production, with the caveats intact." detail="A reel does not become ready because it looks finished. Every source, limitation, and health-claim safeguard remains visible until it is complete." />
          {workspace.drafts.length ? <div className="grid gap-4 xl:grid-cols-2">{workspace.drafts.map(draft => {
            const citation = workspace.citations.find(item => item.reelDraftId === draft.id);
            const voiceAssessment = draft.voiceReferenceAssessment as {
              sourceType: "instagram_reel" | "uploaded_audio";
              sourceUrl?: string;
              creatorAuthorizationRecordedAt: string;
              sourceDurationSeconds: number;
              assessedSegmentSeconds: number;
              languageDetected?: string;
              assessmentStatus: "pending" | "rejected" | "qualified";
              outcomeReason: string;
              assessedAt: string;
            } | null;
            const ready = isReelDraftReady(draft);
            return <article key={draft.id} className="rounded-2xl border border-[#d9ddd6] bg-white p-5 shadow-[0_10px_28px_rgba(25,28,36,0.035)]"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a8381]">Reel draft #{draft.id}</p><h3 className="mt-2 font-serif text-2xl leading-tight text-[#20232b]">{draft.topic}</h3></div><StatusPill value={draft.status} /></div><div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8583]">Narration spans</p><div className="mt-2 space-y-2">{(draft.narrationSpans as string[]).map((span, index) => <p key={index} className="rounded-lg bg-[#f6f7f4] px-3 py-2 text-xs leading-5 text-[#4c5654]"><span className="mr-2 font-semibold text-[#2b3331]">{String(index + 1).padStart(2, "0")}</span>{span}</p>)}</div></div><div className="min-w-[170px]"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8583]">Keyframes</p><div className="mt-2 grid grid-cols-2 gap-2">{(draft.visualKeyframes as { label: string; status: string }[]).slice(0, 4).map((keyframe, index) => <div key={`${keyframe.label}-${index}`} className="relative aspect-[9/11] overflow-hidden rounded-lg border border-[#dce0d9] bg-[#e9ede9]"><img src={keyframeAssets[index]} alt={`${keyframe.label} keyframe`} className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-[#10151d]/82 px-2 py-1.5 text-white"><p className="truncate text-[9px] font-semibold">{keyframe.label}</p><p className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-[#c4d0c5]">{keyframe.status}</p></div></div>)}</div></div></div><div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-[#e1e4df] p-3"><div className="flex items-center justify-between"><span className="text-xs font-medium text-[#36403c]">Background music</span><StatusPill value={draft.bgmStatus} /></div><div className="mt-3 flex items-center justify-between"><span className="text-xs font-medium text-[#36403c]">Creator voice</span><StatusPill value={draft.voiceStatus} /></div></div><div className="rounded-xl border border-[#e1e4df] p-3"><p className="text-xs font-medium text-[#36403c]">Readiness checklist</p><div className="mt-2 space-y-2">{[["Source cited", draft.sourceCited], ["Limitation line present", draft.limitationLinePresent], ["Not-medical-advice flag", draft.notMedicalAdvice], ["Private source pack complete", draft.sourcePackStatus === "complete"], ["Health red flags cleared", draft.healthRedFlagsCleared]].map(([label, checked]) => <div key={String(label)} className="flex items-center gap-2 text-xs text-[#54605a]"><Checkbox checked={Boolean(checked)} disabled /><span>{String(label)}</span></div>)}</div></div></div>{voiceAssessment ? <div className="mt-4 rounded-xl border border-[#ecd2ca] bg-[#fff8f5] p-3 text-xs leading-5 text-[#6f554e]"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-[#8d4736]">Private voice-reference assessment</span><StatusPill value={voiceAssessment.assessmentStatus === "qualified" ? "approved" : voiceAssessment.assessmentStatus === "rejected" ? "blocked" : "needs_review"} /></div><p className="mt-2"><span className="font-semibold text-[#8d4736]">Source · </span>{voiceAssessment.sourceType.replaceAll("_", " ")} · {voiceAssessment.sourceDurationSeconds.toFixed(1)}s observed · {voiceAssessment.assessedSegmentSeconds}s assessed</p><p><span className="font-semibold text-[#8d4736]">Outcome · </span>{voiceAssessment.outcomeReason}</p>{voiceAssessment.sourceUrl ? <a href={voiceAssessment.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-medium text-[#8d4736] underline underline-offset-4">Open assessed source</a> : null}<p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a34839]">Voice generation: blocked pending qualified source and separate owner confirmation</p></div> : null}{draft.sourcePack ? <div className="mt-4 rounded-xl border border-[#d5e2ed] bg-[#f5f9fc] p-3 text-xs leading-5 text-[#536174]"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-[#364a64]">Private source pack</span><StatusPill value={draft.sourcePackStatus} /></div><a href={draft.sourcePack.primarySourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-medium text-[#315e88] underline underline-offset-4">Primary source</a><p className="mt-2"><span className="font-semibold text-[#364a64]">Context · </span>{draft.sourcePack.populationContext}</p><p><span className="font-semibold text-[#364a64]">Cross-check · </span>{draft.sourcePack.crossValidationStatus.replaceAll("_", " ")}</p><p><span className="font-semibold text-[#364a64]">Hinglish safety · </span>{draft.sourcePack.hinglishSafetyGuidance}</p>{draft.sourcePack.healthRedFlags.length ? <p className="mt-2 font-semibold text-[#a34839]">Health flags: {draft.sourcePack.healthRedFlags.join(", ")}</p> : null}</div> : <div className="mt-4 rounded-xl border border-[#ead9af] bg-[#fffbf1] p-3 text-xs text-[#8e6417]">Private source pack is missing. Draft approval remains locked.</div>}{citation && <div className="mt-4 rounded-xl bg-[#f5f7fb] p-3 text-xs leading-5 text-[#536174]"><span className="font-semibold text-[#364a64]">Citation record · </span>{citation.journal} ({citation.publicationYear}) · {citation.doi || citation.pmid || "Identifier pending"}<br /><span className="font-semibold text-[#364a64]">Limitation · </span>{citation.limitationSentence}</div>}<div className="mt-5 flex flex-col gap-3 border-t border-[#eceeea] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#687076]">{ready ? "Every production and safety check is present." : "Approval stays unavailable until the private source pack, health safety, and production requirements are complete."}</p><Button disabled={!ready || draft.approvedForPublish} onClick={() => setApprovalDraftId(draft.id)} className="rounded-xl bg-[#202633] hover:bg-[#303949] disabled:bg-[#dfe3df] disabled:text-[#8b928b]">{draft.approvedForPublish ? <><Check className="mr-2 h-4 w-4" />Approved</> : <><LockKeyhole className="mr-2 h-4 w-4" />Approve for publish</>}</Button></div></article>;
          })}</div> : <EmptyPanel icon={Sparkles} title="No reel drafts are in production." detail="When a screened study is promoted to production, its script spans, visual keyframes, BGM status, voice status, and all three safety flags will appear here." />}
        </section>

        <section id="weekly-compilation" className="scroll-mt-6 border-t border-[#d9ddd6] pt-12">
          <SectionHeading eyebrow="03 · Weekly compilation queue" title="Seven days. One evidence trail." detail="A bundle is ready to compile only when every linked daily reel has a complete source pack, cleared health flags, and the required limitation, voice, and media checks." />
          {bundleReadiness.length ? <div className="grid gap-4 xl:grid-cols-2">{bundleReadiness.map(({ bundle, linked, completed, ready }) => <article key={bundle.id} className="rounded-2xl border border-[#d9ddd6] bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a8381]">Week of {new Date(bundle.weekStart).toLocaleDateString()}</p><h3 className="mt-2 font-serif text-2xl text-[#20232b]">{bundle.title}</h3></div><StatusPill value={ready ? "ready_to_compile" : bundle.status} /></div><div className="mt-5 grid grid-cols-7 gap-1.5">{Array.from({ length: 7 }).map((_, index) => <div key={index} className={`h-11 rounded-lg border ${index < completed ? "border-[#9fc89c] bg-[#eaf7eb]" : "border-[#d9ddd6] bg-[#f5f6f3]"}`} title={`Day ${index + 1}`} />)}</div><div className="mt-4 flex items-center justify-between text-xs"><span className="text-[#687076]">{completed} of 7 reels ready</span><span className={ready ? "font-semibold text-[#397644]" : "font-semibold text-[#9d6817]"}>{ready ? "Ready to compile" : "Waiting on readiness"}</span></div></article>)}</div> : <EmptyPanel icon={Layers3} title="No weekly bundle has started." detail="A seven-reel compilation is created only after daily drafts are linked to a defined week." />}
        </section>

        <section id="publishing-status" className="scroll-mt-6 border-t border-[#d9ddd6] pt-12">
          <SectionHeading eyebrow="04 · Publishing status" title="Approval is a record, not a trigger." detail="This view distinguishes editorial readiness from a deliberate owner approval. No automated publishing job is connected to either state." />
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"><article className="rounded-2xl border border-[#cfd8c3] bg-[#f6faef] p-5"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ddefc6] text-[#4d7524]"><ShieldAlert className="h-5 w-5" /></div><div><p className="font-serif text-xl text-[#2d4219]">Owner-controlled publishing gate</p><p className="mt-1 text-sm leading-6 text-[#5e7348]">The publish state is locked behind an owner-only manual action and remains separate from all external platform operations.</p></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/70 p-3"><p className="font-serif text-2xl text-[#2d4219]">{publishedCount}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#687d55]">Approved records</p></div><div className="rounded-xl bg-white/70 p-3"><p className="font-serif text-2xl text-[#2d4219]">0</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#687d55]">Auto-publish jobs</p></div></div></article><article className="rounded-2xl border border-[#d9ddd6] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a8381]">Platform readiness</p><div className="mt-4 space-y-3">{[["YouTube", "Waiting for completed reel", Clock3], ["Instagram", "Waiting for completed reel", Clock3], ["Facebook", "Blocked: Page access missing", CircleAlert]].map(([platform, status, Icon]) => <div key={String(platform)} className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f7f4] px-3 py-3"><div className="flex items-center gap-2.5"><div className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[#66706b]"><Icon className="h-3.5 w-3.5" /></div><span className="text-sm font-medium text-[#36403c]">{String(platform)}</span></div><span className="text-xs text-[#7a8381]">{String(status)}</span></div>)}</div></article></div>
        </section>

        <section id="content-log" className="scroll-mt-6 border-t border-[#d9ddd6] pt-12 pb-10">
          <SectionHeading eyebrow="05 · Content log" title="A memory for what the audience has already seen." detail="Every approved topic enters a normalized archive. Incoming research is compared against this history before it can safely become a new reel." />
          {workspace.usedTopics.length ? <div className="overflow-hidden rounded-2xl border border-[#d9ddd6] bg-white"><div className="flex items-center justify-between border-b border-[#e9ebe6] bg-[#f7f8f5] px-5 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a8381]">Archive with duplicate guard</p><Badge variant="outline" className="rounded-full border-[#c9d8bd] bg-[#f5faef] text-[10px] font-semibold text-[#557b2d]">ACTIVE MATCHING</Badge></div>{workspace.usedTopics.map(log => { const citation = workspace.citations.find(item => item.reelDraftId === log.reelDraftId); return <div key={log.id} className="grid gap-3 border-b border-[#edf0eb] px-5 py-4 last:border-0 md:grid-cols-[1.2fr_1fr_auto]"><div><p className="font-medium text-[#30363a]">{log.topic}</p><p className="mt-1 font-mono text-[11px] text-[#718080]">{log.topicKey}</p></div><div className="text-xs leading-5 text-[#65706e]">{citation ? <><span className="font-semibold text-[#4f5c58]">{citation.journal} ({citation.publicationYear})</span><br />{citation.doi || citation.pmid || "Identifier pending"}</> : "Citation record follows the linked draft."}</div><div className="flex items-start justify-between gap-3 md:block"><span className="rounded-full bg-[#eef7e9] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4e7729]">Repeat guard active</span><p className="mt-2 text-xs text-[#718080]">{new Date(log.usedAt).toLocaleDateString()}</p></div></div>; })}</div> : <EmptyPanel icon={UploadCloud} title="No approved topics have entered the archive." detail="When an owner approves a fully ready reel, its normalized topic, citation trail, and duplicate guard are stored here for future research screening." />}
        </section>
      </div>

      <Dialog open={approvalDraftId !== null} onOpenChange={open => !open && setApprovalDraftId(null)}><DialogContent><DialogHeader><DialogTitle className="font-serif text-2xl">Record publishing approval?</DialogTitle><DialogDescription>This is an owner-only editorial record for “{draftToApprove?.topic}”. It will not upload or schedule anything on an external platform.</DialogDescription></DialogHeader><div className="rounded-xl border border-[#d9ddd6] bg-[#f7f8f5] p-3 text-sm leading-6 text-[#59625f]">By confirming, you record that the citation, limitation line, not-medical-advice flag, complete private source pack, cleared health red flags, BGM, and voice readiness are complete.</div><DialogFooter><Button variant="outline" onClick={() => setApprovalDraftId(null)}>Cancel</Button><Button onClick={() => approvalDraftId && approve.mutate({ reelDraftId: approvalDraftId })} disabled={approve.isPending} className="bg-[#202633] hover:bg-[#303949]">{approve.isPending ? "Recording…" : "Record approval"}</Button></DialogFooter></DialogContent></Dialog>
    </DashboardLayout>
  );
}
