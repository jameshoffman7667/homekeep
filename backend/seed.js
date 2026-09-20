module.exports = {
  locations: [
    { id: "loc_house", name: "Main House", level: "Property", parentId: null, createdBy: null },
    { id: "loc_f1", name: "1st Floor", level: "Floor", parentId: "loc_house", createdBy: null },
    { id: "loc_f2", name: "2nd Floor", level: "Floor", parentId: "loc_house", createdBy: null },
    { id: "loc_util", name: "Utility Room", level: "Room", parentId: "loc_f1", createdBy: null },
    { id: "loc_kitchen", name: "Kitchen", level: "Room", parentId: "loc_f1", createdBy: null },
    { id: "loc_bath", name: "Primary Bathroom", level: "Room", parentId: "loc_f2", createdBy: null },
    { id: "loc_garage", name: "Garage", level: "Structure", parentId: null, createdBy: null },
  ],
  assets: [
    { id: "a_furnace", name: "Furnace", category: "HVAC", locationId: "loc_util", manufacturer: "Carrier", model: "58STA080", serial: "SN-2019-4471", purchaseDate: "2019-10-02", warrantyEnd: "2029-10-02", notes: "Installed with new ductwork.", createdBy: null },
    { id: "a_wh", name: "Water Heater", category: "Plumbing", locationId: "loc_util", manufacturer: "Rheem", model: "XE50T10H45U0", serial: "SN-2021-0092", purchaseDate: "2021-03-14", warrantyEnd: "2027-03-14", notes: "", createdBy: null },
    { id: "a_fridge", name: "Refrigerator", category: "Appliance", locationId: "loc_kitchen", manufacturer: "LG", model: "LRFVS3006S", serial: "SN-2022-7761", purchaseDate: "2022-01-11", warrantyEnd: "2024-01-11", notes: "", createdBy: null },
    { id: "a_car", name: "Honda CR-V", category: "Vehicle", locationId: "loc_garage", manufacturer: "Honda", model: "CR-V EX-L", serial: "1HGCM82633A004352", purchaseDate: "2022-06-01", warrantyEnd: "2025-06-01", notes: "", createdBy: null },
  ],
  bomNodes: [
    { id: "b_burner", assetId: "a_furnace", parentId: null, name: "Burner Assembly", level: "Component", manufacturer: "", model: "", installDate: "", cost: "", notes: "" },
    { id: "b_blower", assetId: "a_furnace", parentId: "b_burner", name: "Blower", level: "Sub-component", manufacturer: "", model: "", installDate: "", cost: "", notes: "" },
    { id: "b_ignitor", assetId: "a_furnace", parentId: "b_burner", name: "Ignitor", level: "Sub-component", manufacturer: "White-Rodgers", model: "767A-372", installDate: "2019-10-02", cost: "45", notes: "" },
    { id: "b_control", assetId: "a_furnace", parentId: "b_burner", name: "Control System", level: "Sub-component", manufacturer: "", model: "", installDate: "", cost: "", notes: "" },
    { id: "b_motor", assetId: "a_furnace", parentId: "b_blower", name: "Motor", level: "Part", manufacturer: "GE", model: "5KCP39", installDate: "2019-10-02", cost: "180", notes: "" },
    { id: "b_fancage", assetId: "a_furnace", parentId: "b_blower", name: "Fan Cage", level: "Part", manufacturer: "", model: "", installDate: "2019-10-02", cost: "35", notes: "" },
    { id: "b_thermo", assetId: "a_furnace", parentId: "b_ignitor", name: "Thermocouple", level: "Part", manufacturer: "Honeywell", model: "Q340A1074", installDate: "2019-10-02", cost: "12", notes: "" },
  ],
  pmTemplates: [
    { id: "pm_filter", assetId: "a_furnace", bomNodeId: null, title: "Replace furnace filter", freqType: "Time-based", interval: "3", unit: "months", nextDue: "2026-09-20", estCost: "20", notes: "16x25x1 pleated filter" },
    { id: "pm_ignitor", assetId: "a_furnace", bomNodeId: "b_ignitor", title: "Inspect / replace ignitor", freqType: "Time-based", interval: "5", unit: "years", nextDue: "2029-10-02", estCost: "60", notes: "" },
  ],
  workRequests: [
    {
      id: "wr_1", number: 1, title: "Furnace ignitor clicking, won't light",
      description: "Hear repeated clicking from the utility room, furnace never actually lights.",
      assetId: "a_furnace", bomNodeId: "b_ignitor", locationId: "loc_util",
      requestedBy: "Jamie", dateSubmitted: "2026-09-05", requiredByDate: "2026-09-22",
      priority: "High", suggestedType: "Corrective", suggestedPartIds: ["inv_ignitor"],
      status: "Under Review", reviewNote: "", workOrderId: null, createdBy: "Jamie",
    },
  ],
  workOrders: [
    {
      id: "wo_1", number: 1, title: "Replace furnace filter", type: "PM", status: "Completed",
      assetId: "a_furnace", bomNodeId: null, locationId: "loc_util",
      description: "Quarterly filter swap.",
      sourceRequestId: null, sourceBenchmarkId: null, sourcePmBaseId: null, sourceFixedDate: null,
      priority: "Medium", executorId: null,
      scheduledDate: "2026-06-20", requiredByDate: "2026-06-25", completedDate: "2026-06-20", verifiedDate: null,
      cost: "19", vendorId: null, notes: "Used 16x25x1 pleated filter.",
      partIds: ["inv_filter"], createdBy: null,
    },
  ],
  benchmarks: [
    { id: "bm_repaint", title: "Bedroom repaint", checklist: "Patch holes; sand; prime; two coats; reinstall outlet covers", estCost: "220", estTime: "6", notes: "Behr Marquee eggshell held up best last time.", vendorId: null, version: 1, createdBy: null },
  ],
  vendors: [
    { id: "v_hvac", name: "Cool Air HVAC Co.", specialty: "HVAC", contact: "(555) 019-2231", link: "", notes: "Same-day emergency calls.", createdBy: null },
  ],
  inventory: [
    { id: "inv_filter", partNumber: 1, name: "16x25x1 Furnace Filter", description: "Pleated 1-inch filter for the utility room furnace.", manufacturer: "", manufacturerPartNumber: "", cost: "12", link: "", assetId: "a_furnace", bomNodeId: null, qty: 2, reorderAt: 1, createdBy: null },
    { id: "inv_ignitor", partNumber: 2, name: "Furnace Ignitor", description: "Hot surface ignitor, direct replacement.", manufacturer: "White-Rodgers", manufacturerPartNumber: "767A-372", cost: "45", link: "", assetId: "a_furnace", bomNodeId: "b_ignitor", qty: 1, reorderAt: 1, createdBy: null },
  ],
  counters: { wo: 1, wr: 1, part: 2 },
};
