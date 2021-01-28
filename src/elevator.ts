import { elevator as Elevator, floor as Floor } from 'interface/api';

interface ElevatorState {
    currentFloor: ReturnType<Elevator['currentFloor']>;
    destinationDirection: ReturnType<Elevator['destinationDirection']>;
    destinationQueue: Elevator['destinationQueue'];
    pressedFloors: ReturnType<Elevator['getPressedFloors']>;
    loadFactor: ReturnType<Elevator['loadFactor']>;
    [fieldName: string]: number | string | number[];
}
interface ElevatorExtensions {
    /** Convenience function for getting the number of an elevator */
    num: number;
    /** The elevator state as it was in the last call to {@link solution['update']} */
    previousState: ElevatorState;
    /** Retrieve the current state of the elevator */
    getState: () => ElevatorState;
    claimRequest: (request: TravelRequest['pickups'][number]) => void;
    fulfillPickups: (requests: TravelRequest['pickups'][number][]) => void;
    requests: TravelRequest[];
}
interface FloorExtensions {
    /** Convenience function for getting the floor number. ! Not to be modified ! */
    num: number;
}
interface SolutionWithExtensions {
    /** called when the challenge starts */
    init: (elevators: Elevator[], floors: Floor[]) => void;
    /** called repeatedly during the challenge */
    update: (dt: number, elevators: (Elevator & ElevatorExtensions)[], floors: (Floor & FloorExtensions)[]) => void;
}
interface request<floorNum extends number = number> {
    floorNum: floorNum;
    creationTime: number;
    fulfillmentTime?: number;
}
interface TravelRequest<pickupFloor extends number = number> {
    pickups: (request<pickupFloor> & {
        direction: 'up' | 'down';
        claimTime?: number;
        claimingElevator?: number;
    })[];
    dropoff?: request;
}

// Global declarations (Here to satisfy typescript; Need to be initialized in init; automatically removed on build)
let time: number;
let pickupRequests: TravelRequest['pickups'];

let handleNewPickupRequest: (request: TravelRequest['pickups']) => void;
/** Get the number of seconds that have passed in the game rounded to 3 decimal places */
let getTime: () => number;
let assert: (condition: boolean, message: [any, ...any]) => void;

const solution: SolutionWithExtensions =
{
    init: function (baseElevators, baseFloors) {
        // Init Globals
        time = 0;
        getTime = () => Math.round(time * 1000) / 1000;
        assert = (condition, message) => { if (!condition) { console.log("ALERT: ", ...message); window.alert(message); } }
        pickupRequests = [];
        // Add customizations to objects

        type ExtendedElevator<InitialElevator extends Elevator, NewProp extends keyof ElevatorExtensions> =
            InitialElevator & Pick<ElevatorExtensions, NewProp>;
        type ElevatorInitFn<PreProps extends keyof ElevatorExtensions, PostProps extends keyof ElevatorExtensions> =
            <T extends ExtendedElevator<Elevator, PreProps>>(e: T) => ExtendedElevator<T, PostProps>;
        const elevatorExtender: (e: Elevator, i: number) => (Elevator & ElevatorExtensions) = (elevator, elevatorNum) => {
            const initFns: [
                ElevatorInitFn<never, 'num' | 'getState' | 'claimRequest' | 'requests'>,
                ElevatorInitFn<'requests' | 'getState', 'previousState' | 'fulfillPickups'>,
            ] = [
                    (elevator) => Object.assign(elevator, {
                        getState: (() => ({
                            currentFloor: elevator.currentFloor(),
                            destinationDirection: elevator.destinationDirection(),
                            destinationQueue: [...elevator.destinationQueue], // Array copy
                            loadFactor: elevator.loadFactor(),
                            pressedFloors: elevator.getPressedFloors(),
                        })) as ElevatorExtensions['getState'],
                        claimRequest: ((request) => {
                            request.claimingElevator = elevatorNum;
                            request.claimTime = getTime();
                            elevator.goToFloor(request.floorNum);
                        }) as ElevatorExtensions['claimRequest'],
                        num: elevatorNum,
                        requests: [],
                    }),
                    (elevator) => Object.assign(elevator, {
                        previousState: elevator.getState(), // Setting Initial State
                        fulfillPickups: ((requestsToPickUp) => {
                            // TODO: How do we handle it if not everyone got picked up?
                            // Remove each pickup request from global list and add it to elevator.requests
                            requestsToPickUp.forEach((requestToPickUp) => {
                                elevator.requests.push(
                                    ...pickupRequests.splice(pickupRequests.findIndex((request) => request === requestToPickUp), 1)
                                        .map((pickupRequest): TravelRequest => ({
                                            pickups: [{
                                                ...pickupRequest,
                                                fulfillmentTime: getTime(),
                                            }],
                                        })));
                            });
                        }) as ElevatorExtensions['fulfillPickups'],
                    }),
                ];
            return initFns[1](initFns[0](elevator));
        };
        const elevators = baseElevators.map(elevatorExtender);
        const floors = baseFloors.map((floor, index) => Object.assign(floor, {
            num: index,
        } as FloorExtensions));

        // Logic
        handleNewPickupRequest = function(request) {
            console.log("New Pickup Request:\n", request);
            pickupRequests.push(request);
            // If the elevator is currently waiting, make sure it gets the task.
            elevators[0].claimRequest(request);
        }

        elevators.forEach((elevator) => {
            elevator.on("idle", () => {
                // floors.forEach((floor) => elevator.goToFloor(floor.floorNum()));
            });
            elevator.on("floor_button_pressed", (floorNum) => {
                // TODO: add the dropoff request to it
                // REVISIT: What about if two get on at once? If they're going to the same floor
                elevator.requests.filter((request) =>
                    !('dropoff' in request) && 'fulfillmentTime' in request.pickup &&
                    request.pickup.floorNum === elevator.currentFloor() &&
                    request.pickup.direction === (floorNum > elevator.currentFloor() ? 'up' : 'down'))
                elevator.goToFloor(floorNum);
            });
            elevator.on("passing_floor", (floorNum) => {
                
            });
            elevator.on("stopped_at_floor", (floorNum) => {
                const pickupsOnFloor = pickupRequests.filter((request) => request.floorNum === floorNum);
                const accidentalPickups = pickupsOnFloor.filter((request) => request.claimingElevator !== elevator.num );
                assert(accidentalPickups.length === 0, [`${accidentalPickups.length} accidental pickup by elevator ${elevator.num}`, accidentalPickups]);
                // We now know that this elevator is the elevator that claimed all pickupsOnFloor
                // TODO: Make sure that we didn't fill up and leave some of the pickups
                
            });
        });
        floors.forEach((floor) => {
            let createPickupRequest = (direction: TravelRequest['pickup']['direction']) => ({
                creationTime: getTime(),
                direction,
                floorNum: floor.num,
            });
            floor.on('up_button_pressed', () => {
                handleNewPickupRequest(createPickupRequest('up'));
            })
            floor.on('down_button_pressed', () => {
                handleNewPickupRequest(createPickupRequest('down'));
            })
        })
    },
    update: function (dt, elevators, floors) {
        time += dt;
        // Check what has changed since last update
        elevators.forEach((elevator) => {
            const currentState = elevator.getState();
            let changedFields: string[] = [];
            Object.keys(currentState).forEach((fieldName) => {
                if (String(currentState[fieldName]) !== String(elevator.previousState[fieldName])) {
                    changedFields.push(fieldName)
                }
            });
            if (changedFields.includes('loadFactor')) {
                // TODO: Update the request loadfactor
                // Could be multiple passengers, some requesting to go up, some down (impossible to know separation at pickup time)
                // const currentRequest = elevator.requests.filter((request) =>
                //     !('dropoff' in request) && 'fulfillmentTime' in request.pickup &&
                //     request.pickup.floorNum === elevator.currentFloor());
                // assert(currentRequest.length === 1)
            }
            changedFields = changedFields.filter((fieldName) => !['currentFloor'].includes(fieldName));
            if (changedFields.length > 0) {
                console.log(`[${getTime()}]: Elevator (${elevator.num}) changes:\n` + changedFields.map((fieldName) =>
                    `\t(${(fieldName+'):').padEnd(22)} [${elevator.previousState[fieldName]} => ${currentState[fieldName]}]`
                ).join('\n'));
            }
            elevator.previousState = elevator.getState();
        });
    }
};
