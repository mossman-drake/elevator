const code = 
{
    init: function(elevators, floors) {
        var pickupRequests = [];
        function addPickupRequest(floor, direction) {
            var idleElevators = getIdleElevators();
            if(idleElevators.length > 0) {
                idleElevators[0].goToFloor(floor.floorNum());
            } else {
                pickupRequests.push(floor.floorNum());
            }
        }
        function getIdleElevators() {
            return elevators.filter(elevator => elevator.destinationDirection() === "stopped")
        }

        elevators.forEach((elevator) => {
            elevator.on("idle", function() {
                if(pickupRequests.length > 0) {
                    const claimedPickup = pickupRequests.pop()
                    elevator.goToFloor(claimedPickup)
                }
            });
            elevator.on("floor_button_pressed", function(floorNum) {
                elevator.goToFloor(floorNum);
            });
            elevator.on("passing_floor", function(floorNum, direction) {
                if(elevator.getPressedFloors().includes(floorNum)) {
                    elevator.goToFloor(floorNum, true);
                    // If this fulfills a pickup request, remove that request
                    pickupRequests = pickupRequests.filter(pickupReq => pickupReq !== floorNum);
                }
            });
        });
        
        floors.forEach((floor) => {
            floor.on("up_button_pressed", function() {
                addPickupRequest(floor, "up");
            });
            floor.on("down_button_pressed", function() {
                addPickupRequest(floor, "down");
            });
        });
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}
;
