import './globals.css';

export const metadata = {
  title: 'Vydrivo — Reviewable Storyboard to Vertical Video',
  description:
    'Turn your idea into a video you can shape. Idea → Review the storyboard → Render with Hindi voice and Hinglish text → Download MP4.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                darkMode: "class",
                theme: {
                  extend: {
                    colors: {
                      brand: {
                        magenta: "#D946EF",
                        coral: "#F0839E",
                        violet: "#7C3AED",
                        amber: "#FBBF24",
                        emerald: "#22C55E"
                      },
                      canvas: {
                        white: "#FFFFFF",
                        soft: "#F8F8F9",
                        border: "#E5E5E8",
                        darkCard: "#141113",
                        darkSection: "#0D0A0E"
                      },
                      ink: {
                        bg: "#0B0B0F",
                        surface: "#141419",
                        raised: "#1B1B22",
                        border: "#26262E",
                        text: "#F5F5F7",
                        muted: "#9A9AA5"
                      },
                      accent: {
                        DEFAULT: "#8B5CF6",
                        strong: "#7C3AED"
                      }
                    },
                    borderRadius: {
                      "DEFAULT": "0.5rem",
                      "lg": "1rem",
                      "xl": "1.5rem",
                      "2xl": "1.75rem",
                      "full": "9999px"
                    },
                    fontFamily: {
                      headline: ["'Outfit'", "'Plus Jakarta Sans'", "sans-serif"],
                      display: ["'Outfit'", "'Plus Jakarta Sans'", "sans-serif"],
                      body: ["'Plus Jakarta Sans'", "sans-serif"],
                      landing: ["'Inter'", "'Plus Jakarta Sans'", "sans-serif"],
                      mono: ["'JetBrains Mono'", "monospace"]
                    }
                  },
                },
              };
            `,
          }}
        />
      </head>
      <body className="bg-white text-[#0B0B0C] font-body selection:bg-brand-magenta selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
