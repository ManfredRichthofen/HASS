import { Toast } from '@base-ui/react/toast'
import { Check, TriangleAlert } from 'lucide-react'
import { cn } from '#/lib/cn'

export const toastManager = Toast.createToastManager()

/** Confirmations appear as an inverted pill above the nav — a different layer in every theme. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex w-[min(100%-2rem,24rem)] flex-col items-center gap-2 outline-none md:bottom-6">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()

  return toasts.map((toast) => {
    const bad = toast.type === 'error'
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          'relative flex min-h-12 max-w-full items-center gap-2.5 rounded-pill bg-ink py-2.5 pr-5 pl-3.5 text-[0.9375rem] text-canvas shadow-sheet transition-ui',
          'brutal:font-label brutal:text-[0.8125rem] brutal:uppercase brutal:shadow-[4px_4px_0_#ffd400]',
          'data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0',
        )}
      >
        {bad ? (
          <TriangleAlert className="size-[18px] shrink-0" />
        ) : (
          <Check className="size-[18px] shrink-0" />
        )}
        <span className="min-w-0">
          {toast.title ? (
            <Toast.Title className="inline font-semibold">{toast.title}</Toast.Title>
          ) : null}
          {toast.description ? (
            <Toast.Description className="inline opacity-75">
              {toast.title ? ' · ' : ''}
              {toast.description}
            </Toast.Description>
          ) : null}
        </span>
      </Toast.Root>
    )
  })
}

/** Confirm an action in its own name ("Relax", "Locked"). Titles ending in "failed" show as errors. */
export function notify(title: string, description?: string) {
  const type = /failed|error|didn't/i.test(title) ? 'error' : 'success'
  toastManager.add({ title, description, type, timeout: 3200 })
}
