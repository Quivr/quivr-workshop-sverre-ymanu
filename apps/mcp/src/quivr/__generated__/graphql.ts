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
      | { __typename: 'Event', id: string, title: string, startTime: string, endTime: string, locations: Array<{ name: string | null, address: string | null }> | null }
      | { __typename: 'EventSpecificationInstance', id: string, title: string, startTime: string, endTime: string, locations: Array<{ name: string | null, address: string | null }> | null }
      | { __typename: 'Lesson', id: string, title: string, startTime: string, endTime: string, teachers: Array<{ name: string }>, locations: Array<{ name: string | null, address: string | null }> | null }
      | { __typename: 'RepeatedEventInstance', id: string, title: string, startTime: string, endTime: string, locations: Array<{ name: string | null, address: string | null }> | null }
    > } };

export type RestaurantsQueryVariables = Exact<{ [key: string]: never; }>;


export type RestaurantsQuery = { restaurants: Array<{ id: string, name: string, location: { name: string | null, address: string | null } | null }> };
