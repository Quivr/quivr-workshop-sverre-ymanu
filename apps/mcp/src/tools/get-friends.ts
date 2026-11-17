import { defineTool } from './define-tool.js'

export const getFriends = defineTool({
  name: 'get_friends',
  description:
    "List the logged-in student's friends on Quivr with their id, first name and last name. Use this first to turn a friend's name into an id before calling find_common_free_slots. If the name the student mentions is not in the list, say so instead of guessing.",
  inputSchema: {},
  run: async (_input, quivr) => {
    const { friendList } = await quivr.getFriends()
    return friendList.map(friend => ({
      id: friend.id,
      firstName: friend.firstName,
      lastName: friend.lastName,
    }))
  },
})
