import type { AlertType } from '../../extensions/alertExtension';

interface IconProps {
  className?: string;
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const ALERT_DISPLAY_LABELS: Record<AlertType, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

export function NoteAlertIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function TipAlertIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z" />
    </svg>
  );
}

export function ImportantAlertIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M7 9h10" />
      <path d="M7 13h6" />
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function WarningAlertIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  );
}

export function CautionAlertIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
      <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z" />
    </svg>
  );
}

const ALERT_ICON_COMPONENTS: Record<
  AlertType,
  typeof NoteAlertIcon
> = {
  note: NoteAlertIcon,
  tip: TipAlertIcon,
  important: ImportantAlertIcon,
  warning: WarningAlertIcon,
  caution: CautionAlertIcon,
};

export function AlertTypeIcon({
  type,
  className,
}: IconProps & { type: AlertType }) {
  const Icon = ALERT_ICON_COMPONENTS[type];
  return <Icon className={className} />;
}

type DomOutputSpec = Array<string | Record<string, unknown> | DomOutputSpec>;

function svgIconSpec(children: DomOutputSpec[]): DomOutputSpec {
  return [
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: '16',
      height: '16',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    ...children,
  ];
}

const ALERT_ICON_SPECS: Record<AlertType, DomOutputSpec> = {
  note: svgIconSpec([
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M12 16v-4' }],
    ['path', { d: 'M12 8h.01' }],
  ]),
  tip: svgIconSpec([
    ['path', { d: 'M9 18h6' }],
    ['path', { d: 'M10 22h4' }],
    ['path', { d: 'M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z' }],
  ]),
  important: svgIconSpec([
    ['path', { d: 'M7 9h10' }],
    ['path', { d: 'M7 13h6' }],
    [
      'path',
      {
        d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
      },
    ],
  ]),
  warning: svgIconSpec([
    ['path', { d: 'M12 9v4' }],
    ['path', { d: 'M12 17h.01' }],
    [
      'path',
      {
        d: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
      },
    ],
  ]),
  caution: svgIconSpec([
    ['path', { d: 'M12 8v4' }],
    ['path', { d: 'M12 16h.01' }],
    [
      'path',
      {
        d: 'M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z',
      },
    ],
  ]),
};

export function getAlertIconSpec(type: AlertType): DomOutputSpec {
  return ['span', { class: 'alert-icon', 'aria-hidden': 'true' }, ALERT_ICON_SPECS[type]];
}

export function getAlertHeaderSpec(type: AlertType): DomOutputSpec {
  return [
    'div',
    { class: 'alert-header', contenteditable: 'false' },
    getAlertIconSpec(type),
    ['span', { class: 'alert-title' }, ALERT_DISPLAY_LABELS[type]],
  ];
}
