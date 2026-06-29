import { useEffect, useMemo, useState } from 'react'
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Bot, CalendarDays, GripVertical, MoveHorizontal, Trash2 } from 'lucide-react'
import dayjs from 'dayjs'
import AiActionPanel from '../components/AiActionPanel.jsx'
import { applicationStatuses, statusMeta } from '../data/mockData.js'
import { careerApi } from '../lib/api.js'

function KanbanCard({ application, onStatusChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: { application },
  })
  const style = { transform: CSS.Translate.toString(transform) }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 ${isDragging ? 'opacity-70 shadow-xl' : ''}`}
      {...attributes}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold leading-5 text-slate-950 dark:text-white">{application.jobOpportunity.title}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{application.jobOpportunity.company.name}</p>
        </div>
        <button className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800" {...listeners}>
          <GripVertical size={17} />
        </button>
      </div>
      <p className="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{application.notes || 'No notes yet.'}</p>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <label className="block">
          <span className="sr-only">Application status</span>
          <select
            className="input py-2 text-xs"
            value={application.status}
            onChange={(event) => onStatusChange(application.id, event.target.value)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {applicationStatuses.map((status) => (
              <option key={status} value={status}>
                {statusMeta[status].label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onDelete(application)}
          onPointerDown={(event) => event.stopPropagation()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 active:translate-y-0 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950"
          title="Remove application"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
        {application.jobOpportunity.applicationDeadline && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-950/70 dark:text-amber-200">
            <CalendarDays size={13} />
            {dayjs(application.jobOpportunity.applicationDeadline).format('MMM D')}
          </span>
        )}
        {application.resumeVersion && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200">
            <Bot size={13} />
            Tailored CV
          </span>
        )}
      </div>
    </article>
  )
}

function KanbanColumn({ status, items, onStatusChange, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const meta = statusMeta[status]

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-0 w-[290px] shrink-0 flex-col rounded-lg border ${meta.accent} bg-white/70 p-3 dark:bg-slate-950/70 ${
        isOver ? 'ring-4 ring-teal-500/10' : ''
      }`}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <span className={`status-pill ${meta.color}`}>{meta.label}</span>
        <span className="text-sm font-bold text-slate-400 dark:text-slate-500">{items.length}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {items.map((item) => (
          <KanbanCard key={item.id} application={item} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))}
      </div>
    </section>
  )
}

function Applications() {
  const [applications, setApplications] = useState([])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    careerApi.applications().then(setApplications)
  }, [])

  const grouped = useMemo(
    () =>
      applicationStatuses.reduce((acc, status) => {
        acc[status] = applications.filter((item) => item.status === status)
        return acc
      }, {}),
    [applications],
  )

  async function changeStatus(appId, nextStatus) {
    if (!appId || !applicationStatuses.includes(nextStatus)) return
    const current = applications.find((item) => item.id === appId)
    if (!current || current.status === nextStatus) return
    setApplications((items) => items.map((item) => (item.id === appId ? { ...item, status: nextStatus } : item)))
    try {
      await careerApi.updateApplicationStatus(appId, nextStatus)
    } catch {
      setApplications((items) => items.map((item) => (item.id === appId ? { ...item, status: current.status } : item)))
    }
  }

  async function deleteApplication(application) {
    if (!window.confirm(`Remove ${application.jobOpportunity.title} from Applications?`)) return
    setApplications((items) => items.filter((item) => item.id !== application.id))
    try {
      await careerApi.deleteApplication(application.id)
    } catch {
      setApplications((items) => [application, ...items])
    }
  }

  async function handleDragEnd(event) {
    const appId = event.active?.id
    const nextStatus = event.over?.id
    await changeStatus(appId, nextStatus)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <AiActionPanel
          title="Pipeline copilot"
          prompt={`Review this application pipeline and give the next three actions. Counts: ${applicationStatuses
            .map((status) => `${status}: ${grouped[status]?.length || 0}`)
            .join(', ')}. Focus on moving Planning to Applied, preparing Interview cards, and follow-ups.`}
        />
        <div className="card flex items-center gap-3 xl:w-72">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <MoveHorizontal size={19} />
          </div>
          <div>
            <p className="font-bold text-slate-950 dark:text-white">Compact board</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Scroll sideways for stages, inside columns for cards.</p>
          </div>
        </div>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="rounded-lg border border-slate-200/80 bg-white/70 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-black/20">
          <div className="flex h-[calc(100vh-310px)] min-h-[430px] gap-4 overflow-x-auto pb-2">
            {applicationStatuses.map((status) => (
              <KanbanColumn key={status} status={status} items={grouped[status] || []} onStatusChange={changeStatus} onDelete={deleteApplication} />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  )
}

export default Applications
