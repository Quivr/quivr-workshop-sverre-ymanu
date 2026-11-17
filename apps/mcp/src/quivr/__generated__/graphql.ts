/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type AllergenKindEnum =
  | 'CELERY'
  | 'EGGS'
  | 'FISH'
  | 'GLUTEN'
  | 'MILK'
  | 'MUSTARD'
  | 'NUTS'
  | 'PEANUTS'
  | 'SESAME'
  | 'SHELLFISH'
  | 'SOY'
  | 'SULFITE';

export type BusynessLevelEnum =
  | 'CLOSED'
  | 'GREEN'
  | 'RED'
  | 'YELLOW';

export type EventInput = {
  allDay?: boolean | null | undefined;
  /** ISO_8601 format */
  endTime: string;
  locations?: Array<LocationInput> | null | undefined;
  notes?: string | null | undefined;
  private?: boolean | null | undefined;
  scheduleId: string | number;
  /** ISO_8601 format */
  startTime: string;
  title: string;
};

export type EventInviteInput = {
  /**
   * The ID of the event this invite corresponds to, this can be a normal or a repeated event.
   *
   */
  eventId: string | number;
  /**
   * The ID of the users which will be invited.
   *
   */
  recipientIds: Array<string | number>;
};

/**
 * The kind of this event specification section. All event specifications in this section
 * are related to the section kind.
 *
 */
export type EventSpecificationSectionKindEnum =
  /**
   * A section that contains event specifications related to a specific company.
   *
   */
  | 'COMPANY'
  /**
   * A section that contains event specifications related to a specific date.
   * For example, a section for all events happening 'Today'.
   *
   */
  | 'DATE'
  /**
   * A section that contains personalized event specifications, such as those tailored to the user's interests.
   *
   */
  | 'PERSONALIZED'
  /**
   * A section that contains popular event specifications. (Trending, etc.)
   *
   */
  | 'POPULAR'
  /**
   * A section that contains event specifications related to a specific tag.
   *
   */
  | 'TAG'
  /**
   * A section that contains event specifications which have ticket sales.
   *
   */
  | 'TICKET_SALE';

export type LocationInput = {
  address?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  name?: string | null | undefined;
  url?: unknown;
};

export type MealCategoryEnum =
  | 'BREAKFAST'
  | 'DESSERT'
  | 'DRINKS'
  | 'OTHER'
  | 'SALADS'
  | 'SANDWICHES'
  | 'SNACKS'
  | 'SOUP'
  | 'WARM_BUFFET';

export type TimeRangeInput = {
  endTime: string;
  startTime: string;
};

export type CreateEventMutationVariables = Exact<{
  eventInput: EventInput;
}>;


export type CreateEventMutation = { createEvent: Array<
    | { id: string, title: string, startTime: string, endTime: string }
    | { id: string, title: string, startTime: string, endTime: string }
    | { id: string, title: string, startTime: string, endTime: string }
    | { id: string, title: string, startTime: string, endTime: string }
  > };

export type CreateEventInvitesMutationVariables = Exact<{
  eventInvitesInput: EventInviteInput;
}>;


export type CreateEventInvitesMutation = { createEventInvites: Array<{ id: string, recipient: { id: string, firstName: string } }> };

export type EventSchedulesQueryVariables = Exact<{ [key: string]: never; }>;


export type EventSchedulesQuery = { schedules: Array<
    | { id: string, title: string | null }
    | { id: string, title: string | null }
    | { id: string, title: string | null }
  > };

export type EventsQueryVariables = Exact<{
  first: number;
}>;


export type EventsQuery = { eventSpecificationsFeed: { nodes: Array<{ id: string, kind: EventSpecificationSectionKindEnum, title: string, eventSpecifications: { nodes: Array<
          | { id: string, title: string, description: string, startTime: string, endTime: string, url: string | null, locations: Array<{ name: string | null, address: string | null }>, companies: Array<{ name: string }>, registration: { soldOut: boolean, ticketKinds: Array<{ name: string, priceCents: number, soldOut: boolean }> } | null }
          | { id: string, title: string, description: string, startTime: string, endTime: string, url: string | null, locations: Array<{ name: string | null, address: string | null }>, companies: Array<{ name: string }>, registration: { soldOut: boolean, ticketKinds: Array<{ name: string, priceCents: number, soldOut: boolean }> } | null }
         | null> | null } } | null> | null } };

export type FakbarsQueryVariables = Exact<{
  onlyShowOpen?: boolean | null | undefined;
}>;


export type FakbarsQuery = { fakbars: Array<{ id: string, name: string, description: string, fakbarData: { busyness: BusynessLevelEnum } | null }> };

export type FriendListQueryVariables = Exact<{ [key: string]: never; }>;


export type FriendListQuery = { friendList: Array<{ id: string, firstName: string, lastName: string }> };

export type FriendSchedulesQueryVariables = Exact<{
  friendIds: Array<string | number> | string | number;
  timeRange: TimeRangeInput;
}>;


export type FriendSchedulesQuery = { friendSchedules: Array<{ friendId: string, scheduleItems: Array<{ id: string, startTime: string, endTime: string, allDay: boolean }> }> };

export type LibrariesQueryVariables = Exact<{ [key: string]: never; }>;


export type LibrariesQuery = { libraries: Array<{ id: string, name: string, data: { capacity: number, occupancy: number, timestamp: string } | null, location: { address: string | null } | null }> };

export type MenuQueryVariables = Exact<{
  restaurantId: string | number;
  timeRange: TimeRangeInput;
}>;


export type MenuQuery = { restaurants: Array<{ id: string, name: string, openingHours: Array<{ day: string, data: Array<{ openFrom: string, openUntil: string }> }>, dishes: Array<{ name: string, mealCategory: MealCategoryEnum | null, prices: Array<number>, vegetarian: boolean, vegan: boolean, allergens: Array<AllergenKindEnum> }> }> };

export type MyScheduleQueryVariables = Exact<{
  timeRange: TimeRangeInput;
}>;


export type MyScheduleQuery = { scheduleItems: { scheduleItems: Array<
      | { __typename: 'Event', id: string, title: string, startTime: string, endTime: string, locations: Array<{ name: string | null, address: string | null, latitude: number | null, longitude: number | null }> | null }
      | { __typename: 'EventSpecificationInstance', id: string, title: string, startTime: string, endTime: string, locations: Array<{ name: string | null, address: string | null, latitude: number | null, longitude: number | null }> | null }
      | { __typename: 'Lesson', id: string, title: string, startTime: string, endTime: string, teachers: Array<{ name: string }>, locations: Array<{ name: string | null, address: string | null, latitude: number | null, longitude: number | null }> | null }
      | { __typename: 'RepeatedEventInstance', id: string, title: string, startTime: string, endTime: string, locations: Array<{ name: string | null, address: string | null, latitude: number | null, longitude: number | null }> | null }
    > } };

export type NewsQueryVariables = Exact<{
  first: number;
  topic?: string | null | undefined;
}>;


export type NewsQuery = { newsArticlesV2: { nodes: Array<{ id: string, title: string, subtitle: string | null, summary: string, content: string, topic: string | null, url: string, datePublished: string, contentProviderName: string } | null> | null } };

export type NewsTopicsQueryVariables = Exact<{ [key: string]: never; }>;


export type NewsTopicsQuery = { newsArticlesTopics: Array<string> };

export type RestaurantsQueryVariables = Exact<{ [key: string]: never; }>;


export type RestaurantsQuery = { restaurants: Array<{ id: string, name: string, location: { name: string | null, address: string | null, latitude: number | null, longitude: number | null } | null }> };
