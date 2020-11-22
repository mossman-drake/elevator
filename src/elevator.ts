import { elevator, floor } from 'interface/api';

interface elevatorState {
    currentFloor: ReturnType<elevator['currentFloor']>;
    destinationDirection: ReturnType<elevator['destinationDirection']>;
    destinationQueue: elevator['destinationQueue'];
    pressedFloors: ReturnType<elevator['getPressedFloors']>;
    loadFactor: ReturnType<elevator['loadFactor']>;
    [fieldName: string]: number | string | number[];
}
interface elevatorExtensions {
    /** Convenience function for getting the number of an elevator */
    num: number;
    /** The elevator state as it was in the last call to {@link solution['update']} */
    previousState: elevatorState;
    /** Retrieve the current state of the elevator */
    getState: () => elevatorState;
}
interface floorExtensions {
    /** Convenience function for getting the floor number. ! Not to be modified ! */
    num: number;
}
interface solutionWithExtensions {
    /** called when the challenge starts */
    init: (elevators: elevator[], floors: floor[]) => void;
    /** called repeatedly during the challenge */
    update: (dt: number, elevators: (elevator & elevatorExtensions)[], floors: (floor & floorExtensions)[]) => void;
}

// Globals
let time: number;

const solution: solutionWithExtensions =
{
    init: function (baseElevators, baseFloors) {
        // Init Globals
        time = 0;
        // Add customizations to objects
        const elevators = baseElevators.map((elevator, index) => {
            let getState = () => ({
                currentFloor: elevator.currentFloor(),
                destinationDirection: elevator.destinationDirection(),
                destinationQueue: elevator.destinationQueue,
                loadFactor: elevator.loadFactor(),
                pressedFloors: elevator.getPressedFloors(),
            });
            const extensions: elevatorExtensions = {
                num: index,
                getState,
                previousState: getState(), // Setting Initial State
            };
            return Object.assign(elevator, extensions)
        });
        const floors = baseFloors.map((floor, index) => Object.assign(floor, {
            num: index,
        } as floorExtensions));

        // Logic
        elevators.forEach((elevator) => {
            elevator.on("idle", () => {
                floors.forEach((floor) => elevator.goToFloor(floor.floorNum()));
            })
        });
    },
    update: function (dt, elevators, floors) {
        time += dt;
        // Check what has changed since last update
        elevators.forEach((elevator) => {
            const currentState = elevator.getState();
            const changedFields: string[] = [];
            Object.keys(currentState).forEach((fieldName) => {
                if (String(currentState[fieldName]) !== String(elevator.previousState[fieldName])) {
                    changedFields.push(fieldName)
                }
            })
            if (changedFields.length > 0) {
                console.log(`[${time.toFixed(3)}]: Elevator (${elevator.num})\n` + changedFields.map((fieldName) =>
                    `\t(${fieldName}) changed: [${elevator.previousState[fieldName]} => ${currentState[fieldName]}]`
                ).join('\n'));
                elevator.previousState = elevator.getState();
            }
        });
    }
};
