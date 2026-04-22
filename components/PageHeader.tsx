interface PageHeaderProps {
  title:    string;
  subtitle?: string;
  icon?:    string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-b border-white/5 bg-[#080b12]/50">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-lg shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-white leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 ml-3 shrink-0">{actions}</div>}
    </div>
  );
}
