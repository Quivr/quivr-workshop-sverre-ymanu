# Quivr API notes

What the workshop starter uses from the Quivr backend (`quivr/backend`, Ruby on Rails + `graphql-ruby`). Personal data in the examples is redacted.

## Endpoint and schema

- One GraphQL endpoint: `POST {QUIVR_BASE_URL}/graphql` (`config/routes.rb`: `post '/graphql', to: 'core/graphql#execute'`).
- Beta (workshop default): `https://rails-beta.quivr.be`. Test accounts are created at <https://alpha.quivr.be>; the Quivr team then makes your account a Quivr member for full API access.
- Production: `https://rails.quivr.be` (also `rails-prod.quivr.be`).
- Docs and a query playground: <https://alpha.quivr.be/graphiql> (members only). It lists every query, mutation and type with descriptions.
- Schema root types: `app/graphql/root/query_type.rb` and `mutation_type.rb`, split per domain under `app/graphql/types/<domain>/`.
- Schema snapshot: `apps/mcp/src/quivr/schema.json` is the introspection result committed in `Quivr/Frontend` (`shared/__generated__/graphql.schema.json`). It was generated against beta, so a field that only exists on production may be missing. Refresh it with an introspection query if needed.

## Auth

`devise_token_auth` (`config/initializers/devise_token_auth.rb`):

- `POST /api/login` with `{ email, password }` (and `otp_attempt` when the response says `need_otp: true`).
- The Quivr team says the response has an `Authorization` header to send with every GraphQL request. The body also contains `data.access_token`, `data.client` and `data.user.email`, which work as the three devise headers `access-token`, `client`, `uid` (= the email). `just login` stores both, and `QuivrClient` sends whatever is set.
- `change_headers_on_each_request = false` and `token_lifespan = 10.years`: the token is stable and can be stored once.
- `DELETE /api/logout` with the same headers revokes the token.
- The login endpoint is rate limited: 10 attempts per minute per email.

The Quivr frontend does the same in `scripts/graphql-login.mjs`. Our version is `apps/mcp/scripts/login.ts`.

## Operations used by the starter tools

| Tool                     | Operation                                                        | Notes                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_my_schedule`        | `scheduleItems(scheduleTypes, timeRange)`                        | Returns `ScheduleItemInterface` (`Lesson`, `Event`, `RepeatedEventInstance`, …). Fetched one day at a time so fixtures line up with dates. |
| `list_restaurants`       | `restaurants`                                                    | No campus field: use `location { name address }`.                                                                                          |
| `get_menu`               | `restaurants(ids) { dishes(timeRange) openingHours(timeRange) }` | `Dish`: `name`, `mealCategory`, `prices` (student price first), `vegetarian`, `vegan`, `allergens`.                                        |
| `get_library_occupancy`  | `libraries { data { occupancy capacity timestamp } }`            | `data` can be null for a library without sensors.                                                                                          |
| `get_friends`            | `friendList { id firstName lastName }`                           | Ids are needed for `find_common_free_slots`.                                                                                               |
| `find_common_free_slots` | `friendSchedules(friendIds, timeRange)` + `scheduleItems`        | Fetched per friend and day. Only times and `allDay` are requested (no titles/locations). Gaps are computed in `tools/free-slots.ts`.       |

`TimeRangeInput` is `{ startTime: Time!, endTime: Time! }` with ISO 8601 times. We send Brussels day boundaries with the offset, for example `2026-11-13T00:00:00+01:00`.

Example response shape for `Menu` (illustrative values, not recorded data; replace with an anonymised excerpt from `apps/mcp/fixtures/Menu.json` after `just record-fixtures`):

```json
{
  "restaurants": [
    {
      "id": "3",
      "name": "Alma 2",
      "openingHours": [
        {
          "day": "2026-11-13T00:00:00+01:00",
          "data": [{ "openFrom": "11:30", "openUntil": "14:00" }]
        }
      ],
      "dishes": [
        {
          "name": "Vegetarische lasagne",
          "mealCategory": "WARM_BUFFET",
          "prices": [4.6, 6.9],
          "vegetarian": true,
          "vegan": false,
          "allergens": ["GLUTEN", "MILK"]
        }
      ]
    }
  ]
}
```

## Operations for the exercises

| Idea               | Operation                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Friends            | `friendList { id firstName lastName }`                                                                                                             |
| Friends' schedules | `friendSchedules(friendIds, timeRange) { friendId scheduleItems { title startTime endTime allDay locations { name } } }` (only what friends share) |
| Search friends     | `findFriend(query) { nodes { id firstName lastName } }`                                                                                            |
| Favourite dishes   | `Dish.favorite` (boolean on each dish)                                                                                                             |
| Create an event    | mutation `createEvent(eventInput: EventInput!)`, needs a `scheduleId` from `schedules(types: [EVENT_SCHEDULE])`                                    |
| Invite friends     | mutation `createEventInvites(eventInvitesInput: { eventId, recipientIds })`                                                                        |
| Received invites   | `receivedEventInvites { id event { title startTime } sender { firstName } accepted }`                                                              |
| News               | `newsArticlesV2(first, topic)`, `newsArticlesTopics`                                                                                               |
| Events and tickets | `eventSpecificationsFeed`, `eventSpecification(id)`, `user { activeOwnedTickets }`                                                                 |
| Student bars       | `fakbars(onlyShowOpen: true)`                                                                                                                      |
| Partner deals      | `partnerCards(first)`                                                                                                                              |

The two mutations only work with `QUIVR_READ_ONLY=false`.

## Differences from the setup plan

- **Node 24, not 22.** The Quivr frontend's `.nvmrc` is `v24.15.0`, so we use that.
- **TypeScript 6.0, not 7.** `typescript-eslint` (used by the Quivr frontend) supports TypeScript up to 6.0.
- **No Docker.** Participants run Quivr natively (rbenv, fnm/nvm, WSL on Windows), so we do too.
- **Vitest instead of Evalite.** Evalite 0.19 pins Vitest 4 internals and the AI SDK v5 provider package, and needs `better-sqlite3`, which compiles from source on Node 24. A ~100-line Vitest runner with `@vitest/ui` does the job.
- **teach's backend is not used.** teach bridges AG-UI to the Agent Client Protocol, which is too heavy here. We only follow its AG-UI client usage (`@ag-ui/client` `HttpAgent`).
