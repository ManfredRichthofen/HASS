import { Toast } from '@base-ui/react/toast'
import { cn } from '#/lib/cn'

export const toastManager = Toast.createToastManager()

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-50 flex w-[min(100%-1.5rem,22rem)] flex-col gap-2 outline-none">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()

  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        'relative rounded-2xl border border-border bg-surface px-4 py-3 pr-8 text-sm text-ink shadow-xl',
        'data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0',
      )}
    >
      {toast.title ? <Toast.Title className="font-medium">{toast.title}</Toast.Title> : null}
      {toast.description ? (
        <Toast.Description className="text-ink-muted">{toast.description}</Toast.Description>
      ) : null}
      <Toast.Close className="absolute top-2 right-2 text-ink-faint hover:text-ink">×</Toast.Close>
    </Toast.Root>
  ))
}

export function notify(title: string, description?: string) {
  toastManager.add({ title, description, timeout: 3200 })
}
