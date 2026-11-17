import { z } from 'zod'

import { defineTool } from './define-tool.js'

const BUSYNESS = {
  GREEN: 'quiet',
  YELLOW: 'moderately busy',
  RED: 'very busy',
} as const

const MAX_DESCRIPTION = 200

const shorten = (text: string) =>
  text.length > MAX_DESCRIPTION
    ? `${text.slice(0, MAX_DESCRIPTION).trimEnd()}…`
    : text

export const getStudentBars = defineTool({
  name: 'get_student_bars',
  description:
    'List the student bars (fakbars) that are open right now, or all of them with an open/closed flag when onlyOpen is false. Returns name, whether it is open now, how busy it is and a short description. It only reflects the current moment: opening hours, addresses and future days are not available, so say so when asked for those.',
  inputSchema: {
    onlyOpen: z
      .boolean()
      .optional()
      .describe('Only bars that are open now (default true)'),
  },
  run: async ({ onlyOpen = true }, quivr) => {
    const open = await quivr.getStudentBars(true)
    const openIds = new Set(open.fakbars.map(bar => bar.id))
    const { fakbars } = onlyOpen ? open : await quivr.getStudentBars(false)

    return {
      bars: fakbars.map(bar => {
        const busyness = bar.fakbarData?.busyness
        const isOpen = openIds.has(bar.id)
        return {
          id: bar.id,
          name: bar.name,
          open: isOpen,
          busyness:
            isOpen && busyness && busyness !== 'CLOSED'
              ? BUSYNESS[busyness]
              : undefined,
          description: shorten(bar.description.trim()) || undefined,
        }
      }),
      note: 'Status is live (now). Opening hours and addresses are not available.',
    }
  },
})
