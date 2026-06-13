import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';
import { Badge, Button, Modal, Input, Select, Textarea } from './ui';
import { useToast } from '@/context/toast-context';
import { useLang } from '@/context/lang-context';
import type { EventItem, EventPayload, EventPriority, EventType, RecurrenceFrequency } from '@/types/event';
import { isAllDayEvent } from '@/utils/date';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  initialValue?: Partial<EventItem> | null;
  onClose: () => void;
  onSubmit: (payload: EventPayload) => Promise<void>;
  allEvents?: EventItem[];
}

const defaultDate = format(new Date(), 'yyyy-MM-dd');

export function EventFormModal({ open, mode, initialValue, onClose, onSubmit, allEvents = [] }: Props) {
  const { pushToast } = useToast();
  const { t, lang } = useLang();
  const initialType = (initialValue?.type || 'hoc') as EventType;
  const [isAllDayToggle, setIsAllDayToggle] = useState(false);
  const [form, setForm] = useState<EventPayload>({
    title: '', description: '', type: initialType, tag_label: '',
    event_date: defaultDate, start_time: '08:00', end_time: '09:00',
    location: '', priority: 'medium', recurrence_frequency: 'none',
    recurrence_interval: 1, recurrence_until_date: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: initialValue?.title || '',
      description: initialValue?.description || '',
      type: (initialValue?.type || 'hoc') as EventType,
      tag_label: initialValue?.tag_label || '',
      event_date: initialValue?.event_date || defaultDate,
      start_time: (initialValue?.start_time || '08:00').slice(0, 5),
      end_time: (initialValue?.end_time || '09:00').slice(0, 5),
      location: initialValue?.location || '',
      priority: initialValue?.deadline?.priority || 'medium',
      recurrence_frequency: initialValue?.recurrence_frequency || 'none',
      recurrence_interval: initialValue?.recurrence_interval || 1,
      recurrence_until_date: initialValue?.recurrence_until_date || null,
    });
    // auto-detect all-day from existing data
    const st = (initialValue?.start_time || '08:00').slice(0, 5);
    const et = (initialValue?.end_time || '09:00').slice(0, 5);
    setIsAllDayToggle(
      initialValue?.type === 'holiday' || (st === '00:00' && et === '23:59')
    );
    setErrors({});
  }, [initialValue, open]);

  // Live conflict detection — skip for all-day/holiday events
  const isAllDay = isAllDayToggle || isAllDayEvent(form);
  const liveConflicts = useMemo(() => {
    if (isAllDay) return [];
    if (!form.event_date || !form.start_time || !form.end_time) return [];
    const editingId = String(initialValue?._id || initialValue?.id || '');

    // Deduplicate by ID first (prevent same event appearing twice)
    const seen = new Map<string, EventItem>();
    for (const e of allEvents) {
      const eId = String(e._id || e.id);
      if (!seen.has(eId)) seen.set(eId, e);
    }

    return Array.from(seen.values()).filter((e) => {
      const eId = String(e._id || e.id);
      if (editingId && eId === editingId) return false;           // skip self
      if (e.event_date !== form.event_date) return false;         // different day → skip
      if (isAllDayEvent(e)) return false;
      const eStart = e.start_time.slice(0, 5);
      const eEnd   = e.end_time.slice(0, 5);
      return form.start_time < eEnd && form.end_time > eStart;
    });
  }, [form.event_date, form.start_time, form.end_time, form.type, allEvents, initialValue, isAllDay]);

  const isDeadline = form.type === 'deadline';
  const isHoliday = form.type === 'holiday';
  const isRecurring = form.recurrence_frequency && form.recurrence_frequency !== 'none';

  // Auto-set times for holiday/all-day
  const handleTypeChange = (newType: EventType) => {
    if (newType === 'holiday') {
      setIsAllDayToggle(true);
      setForm(cur => ({ ...cur, type: newType, start_time: '00:00', end_time: '23:59', recurrence_frequency: 'none' }));
    } else {
      setIsAllDayToggle(false);
      setForm(cur => ({ ...cur, type: newType,
        start_time: cur.start_time === '00:00' ? '08:00' : cur.start_time,
        end_time: cur.end_time === '23:59' ? '09:00' : cur.end_time,
      }));
    }
  };

  const handleAllDayToggle = (checked: boolean) => {
    setIsAllDayToggle(checked);
    setForm(cur => ({
      ...cur,
      start_time: checked ? '00:00' : '08:00',
      end_time:   checked ? '23:59' : '09:00',
    }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = lang === 'ja' ? 'タイトルは必須です' : 'Tiêu đề là bắt buộc';
    if (!form.event_date) next.event_date = lang === 'ja' ? '日付は必須です' : 'Ngày là bắt buộc';
    if (!isAllDay) {
      if (!form.start_time) next.start_time = lang === 'ja' ? '開始時間は必須です' : 'Giờ bắt đầu là bắt buộc';
      if (!form.end_time) next.end_time = lang === 'ja' ? '終了時間は必須です' : 'Giờ kết thúc là bắt buộc';
      if (form.end_time && form.start_time && form.end_time <= form.start_time)
        next.end_time = lang === 'ja' ? '終了時間は開始時間より後にしてください' : 'Giờ kết thúc phải lớn hơn giờ bắt đầu';
    }
    if (liveConflicts.length > 0)
      next.conflict = lang === 'ja' ? '時間が重複しています。時間を調整してから作成してください。' : 'Bị trùng lịch — hãy đổi giờ trước khi tạo.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = <K extends keyof EventPayload>(key: K, value: EventPayload[K]) =>
    setForm((cur) => ({ ...cur, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        priority: form.type === 'deadline' ? (form.priority || 'medium') : undefined,
        recurrence_interval: form.recurrence_frequency === 'none' ? undefined : Math.max(1, Number(form.recurrence_interval || 1)),
        recurrence_until_date: form.recurrence_frequency === 'none' ? null : form.recurrence_until_date,
      });
      onClose();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || (lang === 'ja' ? '不明なエラー' : 'Lỗi không xác định');
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const typeColor = (type: EventItem['type']) =>
    type === 'deadline' ? 'bg-amber-400' : type === 'hoc' ? 'bg-brand-500' : 'bg-violet-500';

  const labels = {
    title: lang === 'ja' ? 'タイトル' : t('title'),
    type: lang === 'ja' ? '種類' : t('type'),
    date: lang === 'ja' ? '日付' : t('date'),
    tag: lang === 'ja' ? 'タグ' : t('tag'),
    startTime: lang === 'ja' ? '開始時間' : t('startTime'),
    endTime: lang === 'ja' ? '終了時間' : t('endTime'),
    recurrence: lang === 'ja' ? '繰り返し' : t('recurrence'),
    interval: lang === 'ja' ? '間隔' : 'Chu kỳ',
    until: lang === 'ja' ? '繰り返し終了' : 'Lặp đến',
    description: lang === 'ja' ? '説明' : t('description'),
    location: lang === 'ja' ? '場所' : t('location'),
    priority: lang === 'ja' ? '優先度' : t('priority'),
    dueDate: lang === 'ja' ? '期限日時' : 'Ngày giờ due',
    createTitle: lang === 'ja' ? '新しいイベントを作成' : t('createEvent'),
    editTitle: lang === 'ja' ? 'イベントを編集' : t('editEvent'),
    save: lang === 'ja' ? '保存' : t('save'),
    cancel: lang === 'ja' ? 'キャンセル' : t('cancel'),
    create: lang === 'ja' ? '作成' : 'Tạo sự kiện mới',
    conflictWarning: lang === 'ja' ? '既存のイベントと時間が重複しています' : t('conflictWarning'),
    onlyDeadline: lang === 'ja' ? '締め切りのみ' : 'Chỉ áp dụng cho deadline',
    overdueWarning: lang === 'ja' ? '指定日時は過去です。このまま作成できますが、期限切れと表示されます。' : 'Ngày đã qua - deadline này sẽ được đánh dấu là quá hạn ngay khi tạo.',
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? labels.createTitle : labels.editTitle}
      description={lang === 'ja' ? '以下の情報を入力してください。' : 'Điền thông tin sự kiện bên dưới.'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>{labels.cancel}</Button>
          <Button
            type="submit"
            form="event-form"
            isLoading={submitting}
            disabled={submitting || liveConflicts.length > 0}
            title={liveConflicts.length > 0 ? (lang === 'ja' ? '時間の重複を解沈してください' : 'Hãy đổi giờ để tránh trùng lịch') : undefined}
          >
            {mode === 'create' ? labels.create : labels.save}
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Error panel */}
        {errors.submit && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/20 p-4">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-300">{lang === 'ja' ? 'エラー' : 'Lỗi'}</p>
            <p className="mt-1 text-sm text-rose-800 dark:text-rose-400">{errors.submit}</p>
          </div>
        )}

        {/* Live conflict preview — BLOCKS creation, reactive to date/time changes */}
        {liveConflicts.length > 0 && (
          <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
                  {lang === 'ja' ? '時間が重複しています！作成できません。' : 'Trùng lịch! Không thể tạo sự kiện.'}
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                  {lang === 'ja'
                    ? `${form.event_date} — 下記 ${liveConflicts.length} 件と重複。時間を変更してください。`
                    : `Ngày ${form.event_date ? new Date(form.event_date + 'T00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''} — đang trùng với ${liveConflicts.length} sự kiện. Đổi giờ bắt đầu/kết thúc để tiếp tục.`
                  }
                </p>
              </div>
            </div>
            <div className="space-y-1.5 mt-2">
              {liveConflicts.map((e) => (
                <div key={String(e._id || e.id)} className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800/50 px-3 py-2">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${typeColor(e.type)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{e.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={labels.title} error={errors.title}>
            <Input value={form.title} onChange={(e) => handleChange('title', e.target.value)}
              placeholder={lang === 'ja' ? 'タイトルを入力' : 'Nhập tiêu đề'} />
          </Field>
          <Field label={labels.type} hint={
            isHoliday
              ? <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  🌍 {lang === 'ja' ? '終日モード' : 'Cả ngày'}
                </span>
              : <Badge tone="brand">{isDeadline ? (lang === 'ja' ? '締め切りモード' : 'Deadline mode') : (lang === 'ja' ? '通常イベント' : 'Standard event')}</Badge>
          }>
            <Select value={form.type} onChange={(e) => handleTypeChange(e.target.value as EventType)}>
              <option value="hoc">{lang === 'ja' ? '📚 学習' : '📚 Học tập'}</option>
              <option value="deadline">{lang === 'ja' ? '⏰ 締め切り' : '⏰ Deadline'}</option>
              <option value="lam_them">{lang === 'ja' ? '💼 アルバイト' : '💼 Làm thêm'}</option>
              <option value="holiday">{lang === 'ja' ? '🌍 祝日・休日' : '🌍 Ngày lễ / Cả ngày'}</option>
            </Select>
          </Field>
        </div>

        {/* All-day banner for holiday */}
        {isHoliday && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-3 flex items-center gap-3">
            <span className="text-2xl">🌍</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {lang === 'ja' ? '終日イベント' : 'Sự kiện cả ngày'}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {lang === 'ja' ? '時間指定なし、0:00ー23:59に自動設定されます' : 'Không cần nhập giờ — tự động đảnh 00:00 – 23:59'}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={labels.date} error={errors.event_date}>
            <Input type="date" value={form.event_date} onChange={(e) => handleChange('event_date', e.target.value)} />
          </Field>
          <Field label={labels.tag}>
            <Input value={form.tag_label} onChange={(e) => handleChange('tag_label', e.target.value)}
              placeholder={lang === 'ja' ? '例：数学、物理' : 'Ví dụ: Toán cao cấp'} />
          </Field>
        </div>

        {/* All-day toggle — available for all event types */}
        {!isHoliday && (
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition select-none">
            <div className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
              isAllDayToggle ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}>
              <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                isAllDayToggle ? 'translate-x-4' : 'translate-x-0'
              }`} />
              <input
                type="checkbox"
                className="sr-only"
                checked={isAllDayToggle}
                onChange={(e) => handleAllDayToggle(e.target.checked)}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {lang === 'ja' ? '終日イベント' : 'Sự kiện cả ngày'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ja'
                  ? '時間指定なし、トラッキングのみ（重複チェックをスキップ）'
                  : 'Chỉ đánh dấu ngày — không cần giờ, không xét trùng lịch'
                }
              </p>
            </div>
            {isAllDayToggle && (
              <span className="ml-auto shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                🌅 {lang === 'ja' ? '終日' : 'Cả ngày'}
              </span>
            )}
          </label>
        )}

        {/* Time fields — hidden for all-day/holiday */}
        {!isAllDay && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={labels.startTime} error={errors.start_time}>
              <Input type="time" value={form.start_time} onChange={(e) => handleChange('start_time', e.target.value)} />
            </Field>
            <Field label={labels.endTime} error={errors.end_time}>
              <Input type="time" value={form.end_time} onChange={(e) => handleChange('end_time', e.target.value)} />
            </Field>
          </div>
        )}

        {/* Recurrence — hidden for holiday */}
        {!isHoliday && (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={labels.recurrence}>
              <Select value={form.recurrence_frequency || 'none'} onChange={(e) => handleChange('recurrence_frequency', e.target.value as RecurrenceFrequency)}>
                <option value="none">{lang === 'ja' ? '繰り返しなし' : 'Không lặp'}</option>
                <option value="daily">{lang === 'ja' ? '毎日' : 'Hằng ngày'}</option>
                <option value="weekly">{lang === 'ja' ? '毎週' : 'Hằng tuần'}</option>
                <option value="monthly">{lang === 'ja' ? '毎月' : 'Hằng tháng'}</option>
              </Select>
            </Field>
            <Field label={labels.interval}>
              <Input type="number" min={1} value={form.recurrence_interval ?? 1}
                onChange={(e) => handleChange('recurrence_interval', Number(e.target.value) as EventPayload['recurrence_interval'])}
                disabled={!isRecurring} />
            </Field>
            <Field label={labels.until} error={errors.recurrence_until_date}>
              <Input type="date" value={form.recurrence_until_date || ''}
                onChange={(e) => handleChange('recurrence_until_date', e.target.value || null)}
                disabled={!isRecurring} />
            </Field>
          </div>
        )}

        {/* Overdue deadline warning */}
        {isDeadline && form.event_date && form.event_date < format(new Date(), 'yyyy-MM-dd') && (
          <div className="rounded-2xl border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800 dark:text-orange-300">
              {lang === 'ja'
                ? '指定日時は過去です。期限切れ状態で作成されます。'
                : 'Ngày đã qua — deadline này sẽ được đánh dấu là quá hạn ngay khi tạo.'}
            </p>
          </div>
        )}

        <Field label={labels.description}>
          <Textarea rows={3} value={form.description} onChange={(e) => handleChange('description', e.target.value)}
            placeholder={lang === 'ja' ? '詳細を入力...' : 'Nhập mô tả chi tiết...'} />
        </Field>

        {/* Location full-width */}
        <Field label={labels.location}>
          <Input value={form.location} onChange={(e) => handleChange('location', e.target.value)}
            placeholder={lang === 'ja' ? '教室、住所...' : 'Phòng học, địa chỉ...'} />
        </Field>

        {/* Priority row — only visible and meaningful for deadline */}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={labels.priority} error={errors.priority}>
            {isDeadline ? (
              <Select value={form.priority || 'medium'} onChange={(e) => handleChange('priority', e.target.value as EventPriority)}>
                <option value="low">{lang === 'ja' ? '🟢 低' : '🟢 Thấp'}</option>
                <option value="medium">{lang === 'ja' ? '🟡 中' : '🟡 Trung bình'}</option>
                <option value="high">{lang === 'ja' ? '🔴 高' : '🔴 Cao'}</option>
              </Select>
            ) : (
              <div className="flex h-[46px] items-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 text-sm text-slate-400 dark:text-slate-500">
                {labels.onlyDeadline}
              </div>
            )}
          </Field>

          {/* Urgency visual indicator — only for deadline */}
          {isDeadline ? (
            <div className="flex flex-col justify-center">
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {lang === 'ja' ? '紫急度のプレビュー' : 'Mức độ hiển thị'}
              </p>
              <div className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition-all ${
                form.priority === 'high'
                  ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30'
                  : form.priority === 'medium'
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30'
                  : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
              }`}>
                <span className="text-2xl">
                  {form.priority === 'high' ? '🔴' : form.priority === 'medium' ? '🟡' : '🟢'}
                </span>
                <div>
                  <p className={`text-sm font-bold ${
                    form.priority === 'high'
                      ? 'text-rose-700 dark:text-rose-400'
                      : form.priority === 'medium'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {form.priority === 'high'
                      ? (lang === 'ja' ? '高优先度' : 'Ưu tiên CAO')
                      : form.priority === 'medium'
                      ? (lang === 'ja' ? '中優先度' : 'Ưu tiên TRUNG BÌNH')
                      : (lang === 'ja' ? '低優先度' : 'Ưu tiên THẤP')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {form.priority === 'high'
                      ? (lang === 'ja' ? 'すぐに対応すべきタスク' : 'Cần xử lý ngay')
                      : form.priority === 'medium'
                      ? (lang === 'ja' ? '通常のスケジュール管理' : 'Quản lý theo lịch')
                      : (lang === 'ja' ? '時間があるときに対応' : 'Xử lý khi rảnh')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div /> 
          )}
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {hint}
      </div>
      {children}
      {error ? <p className="text-xs font-medium text-rose-500 dark:text-rose-400">{error}</p> : null}
    </label>
  );
}
