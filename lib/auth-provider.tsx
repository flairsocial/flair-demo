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
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
