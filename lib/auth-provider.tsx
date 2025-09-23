import { ClerkProvider } from '@clerk/nextjs'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#ffffff',
          colorBackground: '#000000',
          colorText: '#ffffff',
          colorInputBackground: '#262626',
          colorInputText: '#ffffff',
        },
        elements: {
          formButtonPrimary: 'bg-white text-black hover:bg-zinc-200',
          card: 'bg-zinc-900 border border-zinc-800',
          headerTitle: 'text-white',
          headerSubtitle: 'text-zinc-400',
          formFieldLabel: 'text-white',
          formFieldInput: 'bg-zinc-800 border-zinc-700 text-white',
          footerActionLink: 'text-white hover:text-zinc-200',
          // Modal centering fixes for both desktop and mobile
          modalBackdrop: 'backdrop-blur-sm',
          modalContent: 'fixed inset-0 z-50 flex items-center justify-center p-4',
          modal: 'w-full max-w-md mx-auto my-auto',
          // Ensure proper mobile positioning
          rootBox: 'flex items-center justify-center min-h-screen',
          scrollBox: 'flex items-center justify-center min-h-screen p-4',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
