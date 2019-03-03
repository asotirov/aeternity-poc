import * as assert from 'assert';

type POSData = {};

//@Oracle
abstract class BeaconShufflingService {
    static serviceAddressToBeaconId(address: string) {
        return 1; //TODO: return the address of the service based on the hash of the last block in order to shuffle beacons on every block
    }

    static beaconIdToServiceAddress(beaconId: number) {
        return "serviceAddress"; //TODO: return the address of the service based on the hash of the last block in order to shuffle beacons on every block
    }

    static ConfirmationIds = {};

    static getConfirmationId(serviceAddress: string) {
        return BeaconShufflingService.ConfirmationIds[serviceAddress];
    }

    static setConfirmationId(serviceAddress: string, confirmationId) {
        BeaconShufflingService.ConfirmationIds[serviceAddress] = {
            confirmationId: confirmationId, //TODO: ensure uniqueness
            validUntil: Date.now() + 10 * 60 * 1000 // valid for 10 minutes or something
        };
    }


    static isServiceOwneOfConfirmId(confirm_id: number, serviceAddress: string) {
        return BeaconShufflingService.ConfirmationIds[serviceAddress].confirmationId === confirm_id;
    }
}

abstract class Contract {
    protected assertCallerIsOwner() {
        return true;
    }

    protected assertCaller(address: string) {
        return true;
    }
}

//@Contract
export default class BLEProximitySpace extends Contract {
    public addressMap = {};
    public availablePOSMap = {};
    public mintIndex = 1;
    private reverseAddressMap: {};
    private proximityProvider = {}; //TODO: register providers
    private confirmationIds = {};

    /**
     * At any point this is the maximum number of non-conflicting unique beacon addresses that can be handled by this contract.
     * This is because mobile apps can handle 20 UUID ranges, each consisting of 16 bytes of address information.
     */
    private static totalAddressSpace() {
        return 10 * 4294836225;
    }

    /**
     * We reserve the same amount for confirmations.
     */
    private static totalConfirmationSpace() {
        return 10 * 4294836225;
    }

    private canMintAddressSpace(count: number) {
        assert(this.mintIndex + count < BLEProximitySpace.totalAddressSpace());
    }

    constructor(public owner: string) {
        super();
    }

    //@stateful
    public reserveUniqueAddressSpace(address: string, count: number) {
        this.assertCallerIsOwner();
        assert(count > 0, 'Count positive non-zero number');
        assert(this.addressMap[address] === undefined, 'Address already initialized.');
        this.canMintAddressSpace(count);
        this.addressMap[address] = count;
        this.mintIndex += count;
    }

    //@stateful
    public expandAddressSpace(address: string, count: number) {
        this.assertCallerIsOwner();
        assert(count > 0, 'Count positive non-zero number');
        assert(this.addressMap[address] > 0, 'Address not initialized.');
        this.canMintAddressSpace(count);
        this.addressMap[address] += count;
        this.mintIndex += count;
    }

    //@stateful
    public createPOS(address: string, data: POSData) {
        this.assertCaller(address);
        assert(this.addressMap[address] > 0, 'Address not initialized.');
        this.availablePOSMap[address] = this.availablePOSMap[address] || {};
        (this.availablePOSMap[address] as POSData[]).push(data);
    }

    /**
     * Called when some client discovers a beacon
     * @param beacon_id
     */
    public getPOSData(beacon_id: number) {
        return this.addressMap[BeaconShufflingService.beaconIdToServiceAddress(beacon_id)];
    }

    /**
     * Called by the emitting device in order to sync it's beacon_id for it's service
     * @param address
     */
    public syncServiceBeaconId(address: string) {
        this.assertCaller(address);
        return BeaconShufflingService.serviceAddressToBeaconId(address);
    }

    /**
     * Called by the emitting device in order to sync it's beacon_id for it's service
     * @param serviceAddress
     * @param confirmId
     */
    //@stateful
    public syncConfirmationId(serviceAddress: string, confirmId: number) {
        this.assertCaller(serviceAddress);

        //TODO: optionally generate a unique confirm id
        return BeaconShufflingService.setConfirmationId(serviceAddress, confirmId);
    }

    /**
     * Called by proximityService on behalf of a client who has discovered a service
     * in order to confirm it's address and purchase product_id
     * @param proximityProviderServiceAddress
     * @param service_address
     * @param client_id
     */
    public getConfirmationId(proximityProviderServiceAddress: string,
                             service_address: string,
                             client_id: number) {
        this.assertCaller(proximityProviderServiceAddress);
        let {validUntil, confirmationId} = BeaconShufflingService.getConfirmationId(service_address);
        return {
            confirmationId,
            validUntil
        };
    }
}
