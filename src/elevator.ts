import { elevator, floor } from 'interface/api';

interface elevatorExtensions {
    /** Convenience function for getting the number of an elevator */
    num: number,
}
interface floorExtensions {
    /** Convenience function for getting the floor number. ! Not to be modified ! */
    num: number,
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
        const elevators = baseElevators.map((elevator, index) => Object.assign(elevator, {
            num: index,
        } as elevatorExtensions));
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
    }
};
