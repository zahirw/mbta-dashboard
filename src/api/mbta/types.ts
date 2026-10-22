export type DirectionId = 0 | 1

/** GTFS route_type: 0 light rail, 1 subway, 2 commuter rail, 3 bus, 4 ferry */
export type RouteType = 0 | 1 | 2 | 3 | 4

export type VehicleCurrentStatus = 'INCOMING_AT' | 'STOPPED_AT' | 'IN_TRANSIT_TO'

export type VehicleRevenueStatus = 'REVENUE' | 'NON_REVENUE'

export type VehicleOccupancyStatus =
  | 'MANY_SEATS_AVAILABLE'
  | 'FEW_SEATS_AVAILABLE'
  | 'FULL'
  | 'NO_DATA_AVAILABLE'

export type CarriageOccupancyStatus =
  | 'EMPTY'
  | 'MANY_SEATS_AVAILABLE'
  | 'FEW_SEATS_AVAILABLE'
  | 'STANDING_ROOM_ONLY'
  | 'CRUSHED_STANDING_ROOM_ONLY'
  | 'FULL'
  | 'NOT_ACCEPTING_PASSENGERS'
  | 'NO_DATA_AVAILABLE'
  | 'NOT_BOARDABLE'

export interface VehicleCarriage {
  occupancy_status: CarriageOccupancyStatus
  occupancy_percentage: number | null
  label: string | null
}

export interface VehicleAttributes {
  /** Degrees clockwise from true north */
  bearing: number | null
  carriages: VehicleCarriage[] | null
  current_status: VehicleCurrentStatus
  current_stop_sequence: number | null
  direction_id: DirectionId | null
  label: string | null
  latitude: number
  longitude: number
  occupancy_status: VehicleOccupancyStatus | null
  /** Named `revenue_status` in the swagger doc, but the live API returns `revenue`. */
  revenue: VehicleRevenueStatus
  /** Meters per second */
  speed: number | null
  /** ISO8601 */
  updated_at: string
}

export interface ResourceIdentifier {
  type: string
  id: string
}

export interface JsonApiRelationship {
  data: ResourceIdentifier | null
  links?: {
    self?: string
    related?: string
  }
}

export interface VehicleRelationships {
  trip?: JsonApiRelationship
  stop?: JsonApiRelationship
  route?: JsonApiRelationship
}

export interface VehicleResource {
  type: 'vehicle'
  id: string
  attributes: VehicleAttributes
  relationships: VehicleRelationships
  links?: { self?: string }
}

/** Resources returned in `included` when `include` is requested. */
export interface IncludedResource extends ResourceIdentifier {
  attributes?: Record<string, unknown>
  relationships?: Record<string, JsonApiRelationship>
}

export interface PaginationLinks {
  self?: string
  first?: string
  prev?: string
  next?: string
  last?: string
}

export interface VehiclesResponse {
  data: VehicleResource[]
  links?: PaginationLinks
  included?: IncludedResource[]
}

/** Response of `GET /vehicles/{id}` */
export interface VehicleResponse {
  data: VehicleResource
  included?: IncludedResource[]
}

export type VehicleSortKey =
  | 'bearing'
  | 'carriages'
  | 'current_status'
  | 'current_stop_sequence'
  | 'direction_id'
  | 'label'
  | 'latitude'
  | 'longitude'
  | 'occupancy_status'
  | 'revenue'
  | 'speed'
  | 'updated_at'

/** Prefix with `-` for descending. */
export type VehicleSort = VehicleSortKey | `-${VehicleSortKey}`

export type VehicleInclude = 'trip' | 'stop' | 'route'

export interface VehiclesFilter {
  /** Cannot be combined with any other filter. */
  id?: string[]
  /** Cannot be combined with any other filter. */
  trip?: string[]
  label?: string[]
  route?: string[]
  /** Only takes effect together with `route`. */
  directionId?: DirectionId
  routeType?: RouteType[]
  /** Server default is `['REVENUE']` when omitted. */
  revenue?: VehicleRevenueStatus[]
}

export interface VehiclesParams {
  pageLimit?: number
  pageOffset?: number
  sort?: VehicleSort
  fields?: (keyof VehicleAttributes)[]
  include?: VehicleInclude[]
  filter?: VehiclesFilter
}

/** Query options supported by `GET /vehicles/{id}`. */
export type VehicleParams = Pick<VehiclesParams, 'fields' | 'include'>

export interface RouteAttributes {
  /** Hex without `#` */
  color: string
  /** Hex without `#`; legible against `color` */
  text_color: string
  /** Details about stops, schedule, and/or service, e.g. "Rapid Transit" */
  description: string
  /** Index is the `direction_id`; the only place to turn a `direction_id` into a name. */
  direction_names: (string | null)[]
  /** Index is the `direction_id` */
  direction_destinations: (string | null)[]
  fare_class: string
  /** Whether the route should be publicly listed */
  listed_route: boolean
  /** Full, more descriptive name, e.g. "Red Line" */
  long_name: string
  /** Short rider-facing identifier, e.g. "32" or "Green" */
  short_name: string
  /** Routes sort ascending */
  sort_order: number
  type: RouteType
}

export interface RouteRelationships {
  agency?: JsonApiRelationship
  line?: JsonApiRelationship
  route_patterns?: {
    data: ResourceIdentifier[] | null
    links?: { self?: string; related?: string }
  }
}

export interface RouteResource {
  type: 'route'
  id: string
  attributes: RouteAttributes
  relationships: RouteRelationships
  links?: { self?: string }
}

/** Response of `GET /routes` */
export interface RoutesResponse {
  data: RouteResource[]
  links?: PaginationLinks
  included?: IncludedResource[]
}

export type RouteSortKey =
  | 'color'
  | 'description'
  | 'direction_destinations'
  | 'direction_names'
  | 'fare_class'
  | 'listed_route'
  | 'long_name'
  | 'short_name'
  | 'sort_order'
  | 'text_color'
  | 'type'

/** Prefix with `-` for descending. */
export type RouteSort = RouteSortKey | `-${RouteSortKey}`

export type RouteInclude = 'stop' | 'line' | 'route_patterns'

export interface RoutesFilter {
  id?: string[]
  /** Required for `include: ['stop']`. */
  stop?: string[]
  type?: RouteType[]
  /** Only takes effect together with `stop`. */
  directionId?: DirectionId
  /** Service date, `YYYY-MM-DD`. Trips starting between midnight and 3am belong to the previous day. */
  date?: string
  /** Server default is `true` (listed routes only) when omitted. */
  listedRoute?: boolean
}

export interface RoutesParams {
  pageLimit?: number
  pageOffset?: number
  sort?: RouteSort
  fields?: (keyof RouteAttributes)[]
  /** `stop` is only valid together with `filter.stop`. */
  include?: RouteInclude[]
  filter?: RoutesFilter
}

/** `pageOffset` is driven by the infinite query's page param. */
export type RoutesInfiniteParams = Omit<RoutesParams, 'pageOffset'>

export interface TripAttributes {
  /** `trip_short_name`, shown to users */
  name: string
  /** `trip_headsign`, shown to users */
  headsign: string
  /** Groups trips operated by the same vehicle */
  block_id: string | null
  /** Meaning varies by route; see `RouteAttributes.direction_names`. */
  direction_id: DirectionId
  /** 0 = no information, 1 = accessible at stops allowing wheelchair boarding, 2 = inaccessible */
  wheelchair_accessible: 0 | 1 | 2
  /** 0 = no information, 1 = bikes allowed, 2 = bikes not allowed */
  bikes_allowed: 0 | 1 | 2
  revenue_status: VehicleRevenueStatus
}

export interface TripRelationships {
  route?: JsonApiRelationship
  vehicle?: JsonApiRelationship
  service?: JsonApiRelationship
  shape?: JsonApiRelationship
  route_pattern?: JsonApiRelationship
}

export interface TripResource {
  type: 'trip'
  id: string
  attributes: TripAttributes
  relationships: TripRelationships
  links?: { self?: string }
}

/** Response of `GET /trips` */
export interface TripsResponse {
  data: TripResource[]
  links?: PaginationLinks
  included?: IncludedResource[]
}

export type TripSortKey =
  | 'bikes_allowed'
  | 'block_id'
  | 'direction_id'
  | 'headsign'
  | 'name'
  | 'revenue_status'
  | 'wheelchair_accessible'

/** Prefix with `-` for descending. */
export type TripSort = TripSortKey | `-${TripSortKey}`

export type TripInclude =
  | 'route'
  | 'vehicle'
  | 'service'
  | 'shape'
  | 'predictions'
  | 'route_pattern'
  | 'stops'
  | 'from_trip_transfers'
  | 'occupancies'

/** One of `id`, `route`, `routePattern` or `name` MUST be present for any trips to be returned. */
export interface TripsFilter {
  id?: string[]
  name?: string[]
  route?: string[]
  /** e.g. `Red-1-0` */
  routePattern?: string[]
  /** Only takes effect together with `route`. */
  directionId?: DirectionId
  /** Service date, `YYYY-MM-DD`. Trips starting between midnight and 3am belong to the previous day. */
  date?: string
  /** Server default is `['REVENUE']` when omitted. */
  revenue?: VehicleRevenueStatus[]
}

export interface TripsParams {
  pageLimit?: number
  pageOffset?: number
  sort?: TripSort
  fields?: (keyof TripAttributes)[]
  include?: TripInclude[]
  filter?: TripsFilter
}

/** `pageOffset` is driven by the infinite query's page param. */
export type TripsInfiniteParams = Omit<TripsParams, 'pageOffset'>

/** JSON:API error document returned for 400 / 403 / 429 responses. */
export interface MbtaApiErrorBody {
  errors: {
    status?: string
    code?: string
    title?: string
    detail?: string
    source?: { parameter?: string }
  }[]
}
