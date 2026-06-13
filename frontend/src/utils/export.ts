import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { EventItem } from '@/types/event';

function buildRows(events: EventItem[]) {
  return events.map((event) => ({
    title: event.title,
    type: event.type,
    date: format(new Date(event.event_date), 'dd/MM/yyyy'),
    time: `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`,
    location: event.location || '',
    tag: event.tag_label || '',
    priority: event.deadline?.priority || '',
    status: event.deadline ? (event.deadline.is_completed ? 'Hoàn thành' : 'Đang chờ') : '',
    recurrence: event.recurrence_frequency && event.recurrence_frequency !== 'none'
      ? `${event.recurrence_frequency}/${event.recurrence_interval || 1}`
      : '',
  }));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportEventsToCsv(events: EventItem[], filename = `events-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`) {
  const rows = buildRows(events);
  const headers = ['title', 'type', 'date', 'time', 'location', 'tag', 'priority', 'status', 'recurrence'];
  const csv = [headers, ...rows.map((row) => headers.map((key) => `"${String(row[key as keyof typeof row] ?? '').replaceAll('"', '""')}"`))]
    .map((row) => row.join(','))
    .join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function exportEventsToExcel(events: EventItem[], filename = `events-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`) {
  const rows = buildRows(events);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Events');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

export function exportEventsToPdf(events: EventItem[], filename = `events-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Calendar Pro - Events Export', 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 23);

  autoTable(doc, {
    startY: 30,
    head: [['Title', 'Type', 'Date', 'Time', 'Location', 'Tag', 'Priority', 'Status', 'Recurrence']],
    body: buildRows(events).map((row) => [
      row.title,
      row.type,
      row.date,
      row.time,
      row.location,
      row.tag,
      row.priority,
      row.status,
      row.recurrence,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
}
