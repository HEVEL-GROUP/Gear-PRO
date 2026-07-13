import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Calendar, AlertCircle, CheckCircle2, Package, Target, Settings, ChevronRight, ChevronLeft, GripVertical, X, Edit2 } from 'lucide-react';

export default function GearTrackerFixed() {
  // Core State
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedBag, setSelectedBag] = useState(null);
  
  // Modal States
  const [showAddGear, setShowAddGear] = useState(false);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showGearPicker, setShowGearPicker] = useState(false);
  const [showManageBags, setShowManageBags] = useState(false);
  const [showAddBag, setShowAddBag] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showEditGear, setShowEditGear] = useState(false);
  const [editingGear, setEditingGear] = useState(null);
  const [showTripSummary, setShowTripSummary] = useState(false);
  
  // Data State
  const [trips, setTrips] = useState([
    { 
      id: 1, 
      name: 'Elk Hunt - Colorado', 
      date: '2025-11-05',
      endDate: '2025-11-12',
      status: 'upcoming',
      location: 'San Juan Mountains',
      bagAssignments: {
        'bag-1': [2, 3, 4],
        'bag-2': [5]
      }
    },
    { 
      id: 2, 
      name: 'Weekend Backpacking', 
      date: '2025-10-15',
      endDate: '2025-10-17',
      status: 'active',
      location: 'Big Bend National Park',
      bagAssignments: {
        'bag-1': [4],
        'bag-2': [5]
      }
    }
  ]);

  const [gearLibrary, setGearLibrary] = useState([
    { id: 1, name: 'Hubba Hubba NX 2P', category: 'Shelter', weight: 3.5, brand: 'MSR', condition: 'good', isBaseCamp: true, quantity: 1 },
    { id: 2, name: 'Magma 15°F Sleeping Bag', category: 'Sleep', weight: 2.8, brand: 'REI Co-op', condition: 'good', isBaseCamp: false, quantity: 2 },
    { id: 3, name: 'Atmos AG 65L', category: 'Pack', weight: 4.5, brand: 'Osprey', condition: 'good', isBaseCamp: false, quantity: 1 },
    { id: 4, name: 'PocketRocket 2', category: 'Cooking', weight: 0.16, brand: 'MSR', condition: 'good', isBaseCamp: false, quantity: 1 },
    { id: 5, name: 'Squeeze Water Filter', category: 'Water', weight: 0.22, brand: 'Sawyer', condition: 'good', isBaseCamp: false, quantity: 1, expirationDate: '2026-03-15', notes: 'Replace filter annually' },
    { id: 6, name: 'NeoAir XLite', category: 'Sleep', weight: 0.75, brand: 'Therm-a-Rest', condition: 'good', isBaseCamp: false, quantity: 2 },
    { id: 7, name: 'Beta LT Jacket', category: 'Clothing', weight: 0.78, brand: 'Arc\'teryx', condition: 'good', isBaseCamp: false, quantity: 1 },
    { id: 8, name: 'Fuel Canister', category: 'Cooking', weight: 0.25, brand: 'MSR', condition: 'good', isBaseCamp: false, quantity: 3, isConsumable: true, stockLevel: 30, notes: 'Reorder at 25%' },
    { id: 9, name: 'First Aid Kit', category: 'First Aid', weight: 0.5, brand: 'Adventure Medical', condition: 'good', isBaseCamp: false, quantity: 1, expirationDate: '2025-12-31', notes: 'Check medications annually' },
  ]);

  // Bags are now dynamic with custom max weight
  const [bags, setBags] = useState([
    { id: 'bag-1', name: 'My Pack', color: 'blue', maxWeight: 45 },
    { id: 'bag-2', name: "Wife's Pack", color: 'pink', maxWeight: 30 },
  ]);

  const [alerts, setAlerts] = useState([]);

  // Auto-generate alerts based on gear properties
  useEffect(() => {
    const newAlerts = [];
    const today = new Date();
    
    gearLibrary.forEach(gear => {
      // Check stock level for consumables
      if (gear.isConsumable && gear.stockLevel !== undefined && gear.stockLevel < 25) {
        newAlerts.push({
          id: `stock-${gear.id}`,
          gearId: gear.id,
          gearName: `${gear.brand} ${gear.name}`,
          type: 'low',
          message: `Stock at ${gear.stockLevel}% - reorder soon`,
          priority: gear.stockLevel < 10 ? 'high' : 'medium'
        });
      }
      
      // Check expiration dates
      if (gear.expirationDate) {
        const expDate = new Date(gear.expirationDate);
        const daysUntilExp = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExp < 0) {
          newAlerts.push({
            id: `exp-${gear.id}`,
            gearId: gear.id,
            gearName: `${gear.brand} ${gear.name}`,
            type: 'expired',
            message: `Expired ${Math.abs(daysUntilExp)} days ago`,
            priority: 'high'
          });
        } else if (daysUntilExp <= 30) {
          newAlerts.push({
            id: `exp-${gear.id}`,
            gearId: gear.id,
            gearName: `${gear.brand} ${gear.name}`,
            type: 'expiring',
            message: `Expires in ${daysUntilExp} days`,
            priority: daysUntilExp <= 7 ? 'high' : 'medium'
          });
        } else if (daysUntilExp <= 90) {
          newAlerts.push({
            id: `exp-${gear.id}`,
            gearId: gear.id,
            gearName: `${gear.brand} ${gear.name}`,
            type: 'check',
            message: 'Check expiration date soon',
            priority: 'low'
          });
        }
      }
    });
    
    setAlerts(newAlerts);
  }, [gearLibrary]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Dynamic categories
  const [categories, setCategories] = useState([
    'Shelter', 'Sleep', 'Pack', 'Cooking', 'Water', 'Clothing', 
    'Navigation', 'First Aid', 'Tools', 'Electronics', 'Hunting'
  ]);

  const bagColors = {
    blue: { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    pink: { gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    green: { gradient: 'from-green-500 to-green-600', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    orange: { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    purple: { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    gray: { gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  };

  // Helper Functions
  
  // Generate alerts based on gear expiration dates and stock levels
  const generateAlertsFromGear = () => {
    const newAlerts = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    gearLibrary.forEach(gear => {
      // Check expiration dates
      if (gear.expirationDate) {
        const expirationDate = new Date(gear.expirationDate);
        const daysUntilExpiry = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          newAlerts.push({
            id: `exp-${gear.id}`,
            gearId: gear.id,
            gearName: `${gear.brand} ${gear.name}`,
            type: 'expired',
            message: `Expired ${Math.abs(daysUntilExpiry)} days ago`,
            priority: 'high'
          });
        } else if (daysUntilExpiry <= 30) {
          newAlerts.push({
            id: `exp-${gear.id}`,
            gearId: gear.id,
            gearName: `${gear.brand} ${gear.name}`,
            type: 'expiring',
            message: `Expires in ${daysUntilExpiry} days`,
            priority: 'medium'
          });
        } else if (daysUntilExpiry <= 90) {
          newAlerts.push({
            id: `exp-${gear.id}`,
            gearId: gear.id,
            gearName: `${gear.brand} ${gear.name}`,
            type: 'check',
            message: `Check expiration date`,
            priority: 'low'
          });
        }
      }
      
      // Check stock levels for consumables
      if (gear.isConsumable && gear.stockLevel !== undefined) {
        if (gear.stockLevel <= 25) {
          newAlerts.push({
            id: `stock-${gear.id}`,
            gearId: gear.id,
            gearName: `${gear.brand} ${gear.name}`,
            type: 'low',
            message: `Stock at ${gear.stockLevel}% - reorder soon`,
            priority: gear.stockLevel <= 10 ? 'high' : 'medium'
          });
        }
      }
    });
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    newAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return newAlerts;
  };
  
  // Count how many times a gear item is used across all trips
  const getGearUsageCount = (gearId, excludeTripId = null) => {
    return trips.reduce((count, trip) => {
      if (excludeTripId && trip.id === excludeTripId) return count;
      return count + Object.values(trip.bagAssignments).reduce((bagCount, gearIds) => {
        return bagCount + gearIds.filter(id => id === gearId).length;
      }, 0);
    }, 0);
  };

  // Get available quantity for a gear item in current trip
  const getAvailableQuantity = (gearId) => {
    const gear = gearLibrary.find(g => g.id === gearId);
    if (!gear) return 0;
    const usedCount = getGearUsageCount(gearId, selectedTrip?.id);
    const currentTripCount = selectedTrip ? Object.values(selectedTrip.bagAssignments).reduce((count, gearIds) => {
      return count + gearIds.filter(id => id === gearId).length;
    }, 0) : 0;
    return gear.quantity - usedCount;
  };
  const calculateBagWeight = (tripId, bagId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip || !trip.bagAssignments[bagId]) return 0;
    return trip.bagAssignments[bagId].reduce((sum, gearId) => {
      const gear = gearLibrary.find(g => g.id === gearId);
      return sum + (gear?.weight || 0);
    }, 0);
  };

  const calculateTripWeight = (tripId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return 0;
    return Object.keys(trip.bagAssignments).reduce((sum, bagId) => {
      return sum + calculateBagWeight(tripId, bagId);
    }, 0);
  };

  // Calculate base camp weight (gear marked as base camp across all bags in trip)
  const calculateBaseCampWeight = (tripId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return 0;
    return Object.keys(trip.bagAssignments).reduce((sum, bagId) => {
      const bagGear = trip.bagAssignments[bagId].map(id => gearLibrary.find(g => g.id === id)).filter(Boolean);
      const baseCampGear = bagGear.filter(g => g.isBaseCamp);
      return sum + baseCampGear.reduce((gearSum, g) => gearSum + g.weight, 0);
    }, 0);
  };

  // Calculate pack-in weight (excluding base camp gear)
  const calculatePackInWeight = (tripId) => {
    return calculateTripWeight(tripId) - calculateBaseCampWeight(tripId);
  };

  const getTripDuration = (trip) => {
    const start = new Date(trip.date);
    const end = new Date(trip.endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const getNextTrip = () => {
    const upcoming = trips.filter(t => t.status === 'upcoming');
    return upcoming.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  };

  const getBagItemCount = (tripId, bagId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip || !trip.bagAssignments[bagId]) return 0;
    return trip.bagAssignments[bagId].length;
  };

  // Actions
  const addBag = (name, color, maxWeight = 35) => {
    const bag = {
      id: `bag-${Date.now()}`,
      name: name,
      color: color,
      maxWeight: maxWeight
    };
    setBags([...bags, bag]);
    
    // Add this bag to all existing trips
    setTrips(trips.map(trip => ({
      ...trip,
      bagAssignments: {
        ...trip.bagAssignments,
        [bag.id]: []
      }
    })));
    
    setShowAddBag(false);
  };

  const updateBag = (bagId, updates) => {
    setBags(bags.map(bag => 
      bag.id === bagId ? { ...bag, ...updates } : bag
    ));
  };

  const deleteBag = (bagId) => {
    // Check if bag has gear in any trip
    const hasGear = trips.some(trip => 
      trip.bagAssignments[bagId] && trip.bagAssignments[bagId].length > 0
    );
    
    if (hasGear) {
      alert('This bag has gear in it. Please remove all gear first.');
      return;
    }
    
    if (window.confirm('Delete this bag?')) {
      setBags(bags.filter(b => b.id !== bagId));
      
      // Remove bag from all trips
      setTrips(trips.map(trip => {
        const newAssignments = { ...trip.bagAssignments };
        delete newAssignments[bagId];
        return { ...trip, bagAssignments: newAssignments };
      }));
      
      if (selectedBag === bagId) {
        setSelectedBag(bags[0]?.id);
      }
    }
  };

  const deleteTrip = (tripId) => {
    if (window.confirm('Delete this trip? This cannot be undone.')) {
      setTrips(trips.filter(t => t.id !== tripId));
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
        setActiveScreen('dashboard');
      }
    }
  };

  const deleteGearFromLibrary = (gearId) => {
    // Check if gear is being used in any trip
    const inUse = trips.some(trip => 
      Object.values(trip.bagAssignments).some(bag => bag.includes(gearId))
    );
    
    if (inUse) {
      alert('This gear is being used in a trip. Remove it from all trips first.');
      return;
    }
    
    if (window.confirm('Delete this gear from your library?')) {
      setGearLibrary(gearLibrary.filter(g => g.id !== gearId));
    }
  };

  const addGearToTrip = (tripId, gearId, bagId) => {
    // Check if gear is available (quantity check)
    const gear = gearLibrary.find(g => g.id === gearId);
    if (!gear) {
      alert('Gear not found');
      return;
    }
    
    // Count how many times this gear is already used across ALL trips
    const usedInOtherTrips = getGearUsageCount(gearId, tripId);
    
    // Count how many times it's used in THIS trip
    const trip = trips.find(t => t.id === tripId);
    const usedInThisTrip = trip ? Object.values(trip.bagAssignments).reduce((count, gearIds) => {
      return count + gearIds.filter(id => id === gearId).length;
    }, 0) : 0;
    
    const totalUsed = usedInOtherTrips + usedInThisTrip;
    
    if (totalUsed >= gear.quantity) {
      alert(`You only have ${gear.quantity} of this item. It's already packed in ${totalUsed} bag(s).`);
      return;
    }
    
    setTrips(trips.map(trip => {
      if (trip.id === tripId) {
        const updatedAssignments = { ...trip.bagAssignments };
        if (!updatedAssignments[bagId]) {
          updatedAssignments[bagId] = [];
        }
        if (!updatedAssignments[bagId].includes(gearId)) {
          updatedAssignments[bagId] = [...updatedAssignments[bagId], gearId];
        }
        return { ...trip, bagAssignments: updatedAssignments };
      }
      return trip;
    }));
    setShowGearPicker(false);
  };

  const removeGearFromBag = (tripId, gearId, bagId) => {
    setTrips(trips.map(trip => {
      if (trip.id === tripId) {
        const updatedAssignments = { ...trip.bagAssignments };
        updatedAssignments[bagId] = updatedAssignments[bagId].filter(id => id !== gearId);
        return { ...trip, bagAssignments: updatedAssignments };
      }
      return trip;
    }));
  };

  const toggleBaseCamp = (gearId) => {
    setGearLibrary(gearLibrary.map(g => 
      g.id === gearId ? { ...g, isBaseCamp: !g.isBaseCamp } : g
    ));
  };

  const updateGear = (gearId, updates) => {
    setGearLibrary(gearLibrary.map(g => 
      g.id === gearId ? { ...g, ...updates } : g
    ));
  };

  // Category management
  const addCategory = (categoryName) => {
    if (!categoryName || categories.includes(categoryName)) return false;
    setCategories([...categories, categoryName]);
    return true;
  };

  const updateCategory = (oldName, newName) => {
    if (!newName || oldName === newName) return false;
    if (categories.includes(newName)) {
      alert('A category with that name already exists');
      return false;
    }
    
    // Update category name
    setCategories(categories.map(c => c === oldName ? newName : c));
    
    // Update all gear with this category
    setGearLibrary(gearLibrary.map(g => 
      g.category === oldName ? { ...g, category: newName } : g
    ));
    
    return true;
  };

  const deleteCategory = (categoryName) => {
    // Flag all gear with this category as needing category
    setGearLibrary(gearLibrary.map(g => 
      g.category === categoryName ? { ...g, category: 'NEEDS_CATEGORY' } : g
    ));
    
    // Remove category
    setCategories(categories.filter(c => c !== categoryName));
    
    // Add NEEDS_CATEGORY if not present
    if (!categories.includes('NEEDS_CATEGORY')) {
      setCategories([...categories.filter(c => c !== categoryName), 'NEEDS_CATEGORY']);
    }
  };

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  // Filtered gear for library view
  const filteredGear = gearLibrary.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         g.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || g.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Available gear for picker (not already in current bag)
  const getAvailableGear = () => {
    if (!selectedTrip || !selectedBag) return gearLibrary;
    // Always get fresh trip data from trips array
    const currentTrip = trips.find(t => t.id === selectedTrip.id);
    if (!currentTrip) return gearLibrary;
    const currentBagGear = currentTrip.bagAssignments[selectedBag] || [];
    return gearLibrary.filter(g => !currentBagGear.includes(g.id));
  };

  // SCREENS
  
  const DashboardScreen = () => {
    const nextTrip = getNextTrip();
    const activeAlerts = generateAlertsFromGear();
    
    return (
      <div className="space-y-4">
        {/* Hero Card */}
        {nextTrip ? (
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-green-100 text-sm mb-1">Next Adventure</p>
                <h2 className="text-2xl font-bold">{nextTrip.name}</h2>
                <p className="text-green-100 text-sm mt-1">
                  📍 {nextTrip.location} • {new Date(nextTrip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-green-100 text-xs">Pack Weight</p>
                <p className="text-4xl font-bold">{calculateTripWeight(nextTrip.id).toFixed(1)}<span className="text-lg">lbs</span></p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setSelectedTrip(nextTrip);
                  setSelectedBag(bags[0]?.id);
                  setActiveScreen('packing');
                }}
                className="flex-1 bg-white text-green-700 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors"
              >
                Start Packing
              </button>
              <button 
                onClick={() => setActiveScreen('trips')}
                className="px-4 bg-green-500 rounded-xl hover:bg-green-400 transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-3xl p-6 text-white shadow-xl text-center">
            <Calendar size={48} className="mx-auto mb-3 opacity-70" />
            <h2 className="text-xl font-bold mb-2">No Upcoming Trips</h2>
            <p className="text-gray-200 text-sm mb-4">Plan your next adventure</p>
            <button 
              onClick={() => {
                setShowAddTrip(true);
              }}
              className="bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Create New Trip
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-blue-500">
            <Package size={20} className="text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-gray-800">{gearLibrary.length}</p>
            <p className="text-xs text-gray-600">Total Gear</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-green-500">
            <CheckCircle2 size={20} className="text-green-500 mb-2" />
            <p className="text-2xl font-bold text-gray-800">{trips.length}</p>
            <p className="text-xs text-gray-600">Trips</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-orange-500">
            <AlertCircle size={20} className="text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-gray-800">{activeAlerts.length}</p>
            <p className="text-xs text-gray-600">Alerts</p>
          </div>
        </div>

        {/* Alerts */}
        {activeAlerts.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-orange-500" />
              Needs Attention
            </h3>
            <div className="space-y-2">
              {activeAlerts.map(alert => (
                <div key={alert.id} className={`flex items-center justify-between p-3 rounded-xl ${
                  alert.priority === 'high' ? 'bg-red-50' : 
                  alert.priority === 'medium' ? 'bg-orange-50' : 'bg-yellow-50'
                }`}>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{alert.gearName}</p>
                    <p className="text-xs text-gray-600">{alert.message}</p>
                  </div>
                  <button 
                    onClick={() => {
                      // Navigate to gear library
                      setActiveScreen('gear');
                    }}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Trips */}
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">All Trips</h3>
            <button 
              onClick={() => setActiveScreen('trips')}
              className="text-green-600 text-sm font-medium hover:text-green-700"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {trips.slice(0, 3).map(trip => (
              <button
                key={trip.id}
                onClick={() => {
                  setSelectedTrip(trip);
                  setSelectedBag(bags[0]?.id);
                  setActiveScreen('packing');
                }}
                className="w-full bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all"
              >
                <div className="text-left">
                  <p className="font-semibold text-gray-800">{trip.name}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                    <Calendar size={12} />
                    {new Date(trip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {getTripDuration(trip)} days
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Weight</p>
                  <p className="text-lg font-bold text-gray-800">{calculateTripWeight(trip.id).toFixed(1)} lbs</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const PackingScreen = () => {
    if (!selectedTrip || !selectedBag) {
      return (
        <div className="bg-white rounded-2xl p-8 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">No trip selected</p>
          <button 
            onClick={() => setActiveScreen('dashboard')}
            className="mt-4 text-green-600 font-medium hover:text-green-700"
          >
            Go to Dashboard
          </button>
        </div>
      );
    }

    const activeBag = bags.find(b => b.id === selectedBag);
    
    // Always get fresh trip data from trips array
    const currentTrip = trips.find(t => t.id === selectedTrip.id);
    if (!currentTrip) {
      return (
        <div className="bg-white rounded-2xl p-8 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">Trip not found</p>
          <button 
            onClick={() => setActiveScreen('dashboard')}
            className="mt-4 text-green-600 font-medium hover:text-green-700"
          >
            Go to Dashboard
          </button>
        </div>
      );
    }
    
    const bagGearIds = currentTrip.bagAssignments[selectedBag] || [];
    const bagGear = bagGearIds
      .map(id => gearLibrary.find(g => g.id === id))
      .filter(Boolean);
    const bagWeight = calculateBagWeight(currentTrip.id, selectedBag);

    // Calculate base camp weight (gear marked as base camp in this bag)
    const baseCampWeight = bagGear.filter(g => g.isBaseCamp).reduce((sum, g) => sum + g.weight, 0);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <button 
            onClick={() => setActiveScreen('dashboard')}
            className="text-gray-600 text-sm mb-2 flex items-center gap-1 hover:text-gray-800"
          >
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{currentTrip.name}</h2>
              <p className="text-sm text-gray-600">{currentTrip.location}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTripSummary(true)}
                className="text-sm text-green-600 font-medium hover:text-green-700"
              >
                Trip Summary
              </button>
              <button
                onClick={() => setShowManageBags(true)}
                className="text-sm text-blue-600 font-medium hover:text-blue-700"
              >
                Manage Bags
              </button>
            </div>
          </div>
        </div>

        {/* Bag Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {bags.map(bag => {
            const weight = calculateBagWeight(currentTrip.id, bag.id);
            const itemCount = getBagItemCount(currentTrip.id, bag.id);
            
            return (
              <button
                key={bag.id}
                onClick={() => setSelectedBag(bag.id)}
                className={`flex-shrink-0 rounded-2xl p-4 min-w-[140px] transition-all ${
                  selectedBag === bag.id
                    ? `bg-gradient-to-br ${bagColors[bag.color].gradient} text-white shadow-lg scale-105`
                    : 'bg-white text-gray-700 shadow-md'
                }`}
              >
                <p className="font-bold text-lg">{bag.name}</p>
                <p className={`text-sm ${selectedBag === bag.id ? 'text-white/80' : 'text-gray-500'}`}>
                  {weight.toFixed(1)} lbs
                </p>
                <p className={`text-xs ${selectedBag === bag.id ? 'text-white/70' : 'text-gray-400'}`}>
                  {itemCount} items
                </p>
              </button>
            );
          })}
        </div>

        {/* Weight Progress */}
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">{activeBag?.name} Weight</p>
            <p className="text-sm font-bold text-gray-800">{bagWeight.toFixed(1)} / {activeBag?.maxWeight || 35} lbs</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`bg-gradient-to-r ${bagColors[activeBag?.color]?.gradient} h-3 rounded-full transition-all`}
              style={{ width: `${Math.min((bagWeight / (activeBag?.maxWeight || 35)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {bagWeight < (activeBag?.maxWeight || 35) * 0.85 ? '✓ Good weight' : bagWeight < (activeBag?.maxWeight || 35) ? '⚠ Getting heavy' : '⛔ Over target'}
          </p>
          {baseCampWeight > 0 && (
            <p className="text-xs text-orange-600 mt-2">
              ⛺ {baseCampWeight.toFixed(1)} lbs will stay at base camp
            </p>
          )}
        </div>

        {/* Packed Gear */}
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <h3 className="font-bold text-gray-800 mb-3">Packed Gear</h3>
          <div className="space-y-2">
            {bagGear.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package size={40} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No gear packed yet</p>
              </div>
            ) : (
              bagGear.map(gear => (
                <div key={gear.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical size={16} className="text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm">{gear.brand} {gear.name}</p>
                        {gear.isBaseCamp && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            ⛺ Base Camp
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{gear.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-gray-700">{gear.weight} lbs</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGearFromBag(currentTrip.id, gear.id, selectedBag);
                      }}
                      className="text-red-500 hover:text-red-700 p-2 -m-2"
                      aria-label="Remove gear"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowGearPicker(true);
            }}
            className="w-full mt-3 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Gear from Library
          </button>
        </div>

        {/* Category Summary */}
        {bagGear.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3">By Category</h3>
            <div className="space-y-2">
              {categories.map(cat => {
                const catGear = bagGear.filter(g => g.category === cat);
                const catWeight = catGear.reduce((sum, g) => sum + g.weight, 0);
                if (catGear.length === 0) return null;
                
                return (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{catGear.length} items</span>
                      <span className="font-bold text-gray-800">{catWeight.toFixed(1)} lbs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const GearLibraryScreen = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-md">
        <button 
          onClick={() => setActiveScreen('dashboard')}
          className="text-gray-600 text-sm mb-2 flex items-center gap-1 hover:text-gray-800"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Gear Library</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search gear..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterCategory === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Gear Cards */}
      <div className="space-y-2">
        {filteredGear.map(gear => {
          // Calculate alert status for this gear
          const today = new Date();
          let expirationStatus = null;
          if (gear.expirationDate) {
            const expirationDate = new Date(gear.expirationDate);
            const daysUntilExpiry = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry < 0) {
              expirationStatus = { type: 'expired', text: 'EXPIRED', color: 'bg-red-100 text-red-700' };
            } else if (daysUntilExpiry <= 30) {
              expirationStatus = { type: 'expiring', text: `${daysUntilExpiry}d`, color: 'bg-orange-100 text-orange-700' };
            } else if (daysUntilExpiry <= 90) {
              expirationStatus = { type: 'check', text: 'Check date', color: 'bg-yellow-100 text-yellow-700' };
            }
          }
          
          return (
            <div key={gear.id} className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-gray-800">{gear.brand}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {gear.category}
                    </span>
                    {gear.isBaseCamp && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        ⛺ Base Camp
                      </span>
                    )}
                    {gear.quantity > 1 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Qty: {gear.quantity}
                      </span>
                    )}
                    {gear.isConsumable && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        gear.stockLevel <= 10 ? 'bg-red-100 text-red-700' :
                        gear.stockLevel <= 25 ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        Stock: {gear.stockLevel}%
                      </span>
                    )}
                    {expirationStatus && (
                      <span className={`text-xs px-2 py-1 rounded-full ${expirationStatus.color}`}>
                        {expirationStatus.text}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{gear.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{gear.weight} lbs</p>
                  {gear.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">💡 {gear.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingGear(gear);
                      setShowEditGear(true);
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => toggleBaseCamp(gear.id)}
                    className="text-orange-600 hover:text-orange-700 text-xs font-medium"
                  >
                    {gear.isBaseCamp ? 'Remove BC' : 'Set BC'}
                  </button>
                  <button 
                    onClick={() => deleteGearFromLibrary(gear.id)}
                    className="text-red-500 hover:text-red-700 ml-1"
                  >
                    <Trash2 size={18} />
                  </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => setShowAddGear(true)}
        className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add New Gear
      </button>
    </div>
  );

  const TripsScreen = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-md">
        <button 
          onClick={() => setActiveScreen('dashboard')}
          className="text-gray-600 text-sm mb-2 flex items-center gap-1 hover:text-gray-800"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">All Trips</h2>
          <button 
            onClick={() => setShowAddTrip(true)}
            className="text-green-600 font-medium hover:text-green-700"
          >
            + New Trip
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {trips.map(trip => (
          <div key={trip.id} className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{trip.name}</h3>
                <p className="text-sm text-gray-600">{trip.location}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(trip.date).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                </p>
              </div>
              <button 
                onClick={() => deleteTrip(trip.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button 
                onClick={() => {
                  setSelectedTrip(trip);
                  setSelectedBag(bags[0]?.id);
                  setActiveScreen('packing');
                }}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Pack Gear
              </button>
              <div className="text-right px-3 py-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Weight</p>
                <p className="font-bold text-gray-800">{calculateTripWeight(trip.id).toFixed(1)} lbs</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // MODALS

  const AddGearModal = () => {
    const [gearForm, setGearForm] = useState({
      brand: '',
      name: '',
      category: 'Shelter',
      weight: '',
      quantity: 1,
      isBaseCamp: false,
      isConsumable: false,
      stockLevel: 100,
      expirationDate: '',
      notes: ''
    });

    const handleAddGear = () => {
      if (!gearForm.brand || !gearForm.name || !gearForm.weight) {
        alert('Please fill in all required gear details');
        return;
      }
      
      const gear = {
        id: Date.now(),
        brand: gearForm.brand,
        name: gearForm.name,
        category: gearForm.category,
        weight: parseFloat(gearForm.weight),
        quantity: parseInt(gearForm.quantity) || 1,
        condition: 'good',
        isBaseCamp: gearForm.isBaseCamp,
        isConsumable: gearForm.isConsumable,
        stockLevel: gearForm.isConsumable ? parseInt(gearForm.stockLevel) : undefined,
        expirationDate: gearForm.expirationDate || undefined,
        notes: gearForm.notes || undefined
      };
      
      setGearLibrary([...gearLibrary, gear]);
      setShowAddGear(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Add New Gear</h3>
            <button onClick={() => setShowAddGear(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Brand</label>
              <input
                type="text"
                value={gearForm.brand}
                onChange={(e) => setGearForm({...gearForm, brand: e.target.value})}
                placeholder="e.g., MSR, Osprey"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Product Name</label>
              <input
                type="text"
                value={gearForm.name}
                onChange={(e) => setGearForm({...gearForm, name: e.target.value})}
                placeholder="e.g., PocketRocket 2"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
              <select
                value={gearForm.category}
                onChange={(e) => setGearForm({...gearForm, category: e.target.value})}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Weight (lbs)</label>
              <input
                type="number"
                step="0.01"
                value={gearForm.weight}
                onChange={(e) => setGearForm({...gearForm, weight: e.target.value})}
                placeholder="0.00"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Quantity</label>
              <input
                type="number"
                min="1"
                value={gearForm.quantity}
                onChange={(e) => setGearForm({...gearForm, quantity: e.target.value})}
                placeholder="1"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                How many of this item do you own? (e.g., 2 sleeping bags for family trips)
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl">
              <input
                type="checkbox"
                id="basecamp"
                checked={gearForm.isBaseCamp}
                onChange={(e) => setGearForm({...gearForm, isBaseCamp: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="basecamp" className="text-sm text-gray-700">
                This gear stays at base camp (but counts towards pack-in weight)
              </label>
            </div>

            {/* Consumable Section */}
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl mb-3">
                <input
                  type="checkbox"
                  id="consumable"
                  checked={gearForm.isConsumable}
                  onChange={(e) => setGearForm({...gearForm, isConsumable: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="consumable" className="text-sm text-gray-700 font-medium">
                  This is a consumable item (fuel, batteries, food, etc.)
                </label>
              </div>
              
              {gearForm.isConsumable && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Current Stock Level (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gearForm.stockLevel}
                    onChange={(e) => setGearForm({...gearForm, stockLevel: e.target.value})}
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alert will show when stock falls below 25%
                  </p>
                </div>
              )}
            </div>

            {/* Expiration Date */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Expiration Date (Optional)</label>
              <input
                type="date"
                value={gearForm.expirationDate}
                onChange={(e) => setGearForm({...gearForm, expirationDate: e.target.value})}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                For items like first aid supplies, water filters, medications
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Notes (Optional)</label>
              <textarea
                value={gearForm.notes}
                onChange={(e) => setGearForm({...gearForm, notes: e.target.value})}
                placeholder="Maintenance reminders, reorder info, special instructions..."
                rows="2"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
          
          <button
            onClick={handleAddGear}
            className="w-full mt-6 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
          >
            Add to Library
          </button>
        </div>
      </div>
    );
  };

  const EditGearModal = () => {
    const [gearForm, setGearForm] = useState({
      brand: '',
      name: '',
      category: 'Shelter',
      weight: '',
      quantity: 1,
      isBaseCamp: false,
      isConsumable: false,
      stockLevel: 100,
      expirationDate: '',
      notes: ''
    });

    // Update form when editingGear changes
    useEffect(() => {
      if (editingGear) {
        setGearForm({
          brand: editingGear.brand || '',
          name: editingGear.name || '',
          category: editingGear.category || 'Shelter',
          weight: editingGear.weight || '',
          quantity: editingGear.quantity || 1,
          isBaseCamp: editingGear.isBaseCamp || false,
          isConsumable: editingGear.isConsumable || false,
          stockLevel: editingGear.stockLevel || 100,
          expirationDate: editingGear.expirationDate || '',
          notes: editingGear.notes || ''
        });
      }
    }, [editingGear]);

    if (!editingGear) return null;

    const handleUpdateGear = () => {
      if (!gearForm.brand || !gearForm.name || !gearForm.weight) {
        alert('Please fill in all required gear details');
        return;
      }
      
      const updatedGear = {
        ...editingGear,
        brand: gearForm.brand,
        name: gearForm.name,
        category: gearForm.category,
        weight: parseFloat(gearForm.weight),
        quantity: parseInt(gearForm.quantity) || 1,
        isBaseCamp: gearForm.isBaseCamp,
        isConsumable: gearForm.isConsumable,
        stockLevel: gearForm.isConsumable ? parseInt(gearForm.stockLevel) : undefined,
        expirationDate: gearForm.expirationDate || undefined,
        notes: gearForm.notes || undefined
      };
      
      setGearLibrary(gearLibrary.map(g => g.id === editingGear.id ? updatedGear : g));
      setShowEditGear(false);
      setEditingGear(null);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Edit Gear</h3>
            <button onClick={() => {
              setShowEditGear(false);
              setEditingGear(null);
            }} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Brand</label>
              <input
                type="text"
                value={gearForm.brand}
                onChange={(e) => setGearForm({...gearForm, brand: e.target.value})}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Product Name</label>
              <input
                type="text"
                value={gearForm.name}
                onChange={(e) => setGearForm({...gearForm, name: e.target.value})}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
              <select
                value={gearForm.category}
                onChange={(e) => setGearForm({...gearForm, category: e.target.value})}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Weight (lbs)</label>
              <input
                type="number"
                step="0.01"
                value={gearForm.weight}
                onChange={(e) => setGearForm({...gearForm, weight: e.target.value})}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Quantity</label>
              <input
                type="number"
                min="1"
                value={gearForm.quantity}
                onChange={(e) => setGearForm({...gearForm, quantity: e.target.value})}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl">
              <input
                type="checkbox"
                id="edit-basecamp"
                checked={gearForm.isBaseCamp}
                onChange={(e) => setGearForm({...gearForm, isBaseCamp: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="edit-basecamp" className="text-sm text-gray-700">
                Base camp gear
              </label>
            </div>

            {/* Consumable Section */}
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl mb-3">
                <input
                  type="checkbox"
                  id="edit-consumable"
                  checked={gearForm.isConsumable}
                  onChange={(e) => setGearForm({...gearForm, isConsumable: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="edit-consumable" className="text-sm text-gray-700 font-medium">
                  Consumable item (fuel, batteries, etc.)
                </label>
              </div>
              
              {gearForm.isConsumable && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Current Stock Level (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gearForm.stockLevel}
                    onChange={(e) => setGearForm({...gearForm, stockLevel: e.target.value})}
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alert will show when stock falls below 25%
                  </p>
                </div>
              )}
            </div>

            {/* Expiration Date */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Expiration Date</label>
              <input
                type="date"
                value={gearForm.expirationDate}
                onChange={(e) => setGearForm({...gearForm, expirationDate: e.target.value})}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
              <textarea
                value={gearForm.notes}
                onChange={(e) => setGearForm({...gearForm, notes: e.target.value})}
                placeholder="Maintenance reminders, reorder info..."
                rows="2"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
          
          <button
            onClick={handleUpdateGear}
            className="w-full mt-6 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
          >
            Update Gear
          </button>
        </div>
      </div>
    );
  };

  const AddTripModal = () => {
    const [tripForm, setTripForm] = useState({
      name: '',
      date: '',
      endDate: '',
      location: ''
    });

    const handleAddTrip = () => {
      if (!tripForm.name || !tripForm.date || !tripForm.endDate) {
        alert('Please fill in all trip details');
        return;
      }
      
      const trip = {
        id: Date.now(),
        name: tripForm.name,
        date: tripForm.date,
        endDate: tripForm.endDate,
        location: tripForm.location,
        status: 'upcoming',
        bagAssignments: bags.reduce((acc, bag) => ({ ...acc, [bag.id]: [] }), {})
      };
      
      setTrips([...trips, trip]);
      setShowAddTrip(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">New Trip</h3>
            <button onClick={() => setShowAddTrip(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Trip Name</label>
              <input
                type="text"
                value={tripForm.name}
                onChange={(e) => setTripForm({...tripForm, name: e.target.value})}
                placeholder="e.g., Colorado Elk Hunt"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
              <input
                type="text"
                value={tripForm.location}
                onChange={(e) => setTripForm({...tripForm, location: e.target.value})}
                placeholder="e.g., San Juan Mountains"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={tripForm.date}
                  onChange={(e) => setTripForm({...tripForm, date: e.target.value})}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">End Date</label>
                <input
                  type="date"
                  value={tripForm.endDate}
                  onChange={(e) => setTripForm({...tripForm, endDate: e.target.value})}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={handleAddTrip}
            className="w-full mt-6 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
          >
            Create Trip
          </button>
        </div>
      </div>
    );
  };

  const ManageBagsModal = () => {
    const [bagForm, setBagForm] = useState({ name: '', color: 'blue', maxWeight: 35 });
    const [editingBag, setEditingBag] = useState(null);

    const handleAddBag = () => {
      if (!bagForm.name) {
        alert('Please enter a bag name');
        return;
      }
      if (!bagForm.maxWeight || bagForm.maxWeight <= 0) {
        alert('Please enter a valid max weight');
        return;
      }
      addBag(bagForm.name, bagForm.color, parseFloat(bagForm.maxWeight));
      setBagForm({ name: '', color: 'blue', maxWeight: 35 });
    };

    const handleUpdateBag = () => {
      if (!editingBag) return;
      
      if (!editingBag.name) {
        alert('Please enter a bag name');
        return;
      }
      if (!editingBag.maxWeight || editingBag.maxWeight <= 0) {
        alert('Please enter a valid max weight');
        return;
      }
      
      updateBag(editingBag.id, {
        name: editingBag.name,
        color: editingBag.color,
        maxWeight: parseFloat(editingBag.maxWeight)
      });
      setEditingBag(null);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Manage Bags</h3>
            <button onClick={() => setShowManageBags(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          {/* Current Bags */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-semibold text-gray-700">Your Bags</h4>
            {bags.map(bag => (
              <div key={bag.id} className="bg-gray-50 rounded-xl p-3">
                {editingBag?.id === bag.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingBag.name}
                      onChange={(e) => setEditingBag({...editingBag, name: e.target.value})}
                      placeholder="Bag name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Max Weight (lbs)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingBag.maxWeight}
                        onChange={(e) => setEditingBag({...editingBag, maxWeight: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Color</p>
                      <div className="flex gap-2 flex-wrap">
                        {Object.keys(bagColors).map(color => (
                          <button
                            key={color}
                            onClick={() => setEditingBag({...editingBag, color})}
                            className={`w-8 h-8 rounded-full ${bagColors[color].bg} ${
                              editingBag.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateBag}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingBag(null)}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-4 h-4 rounded-full ${bagColors[bag.color].bg}`} />
                      <div>
                        <p className="font-medium text-gray-800">{bag.name}</p>
                        <p className="text-xs text-gray-500">Max: {bag.maxWeight} lbs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingBag(bag)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteBag(bag.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add New Bag */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Add New Bag</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={bagForm.name}
                onChange={(e) => setBagForm({...bagForm, name: e.target.value})}
                placeholder="Bag name (e.g., Kid's Pack)"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Max Weight (lbs)</label>
                <input
                  type="number"
                  step="0.5"
                  value={bagForm.maxWeight}
                  onChange={(e) => setBagForm({...bagForm, maxWeight: e.target.value})}
                  placeholder="35"
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set target weight capacity for this bag
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-700 mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(bagColors).map(color => (
                    <button
                      key={color}
                      onClick={() => setBagForm({...bagForm, color})}
                      className={`w-10 h-10 rounded-full ${bagColors[color].bg} ${
                        bagForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddBag}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
              >
                Add Bag
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GearPickerModal = () => {
    const availableGear = getAvailableGear();
    
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowGearPicker(false);
          }
        }}
      >
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Add Gear to {bags.find(b => b.id === selectedBag)?.name}</h3>
            <button 
              onClick={() => setShowGearPicker(false)} 
              className="text-gray-500 hover:text-gray-700 p-2 -m-2"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-2">
            {availableGear.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package size={40} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">All gear already packed in this bag</p>
              </div>
            ) : (
              availableGear.map(gear => {
                // Calculate how many of this gear are already used
                const usedInOtherTrips = getGearUsageCount(gear.id, selectedTrip?.id);
                const currentTrip = trips.find(t => t.id === selectedTrip?.id);
                const usedInThisTrip = currentTrip ? Object.values(currentTrip.bagAssignments).reduce((count, gearIds) => {
                  return count + gearIds.filter(id => id === gear.id).length;
                }, 0) : 0;
                const totalUsed = usedInOtherTrips + usedInThisTrip;
                const available = gear.quantity - totalUsed;
                const isUnavailable = available <= 0;
                
                return (
                  <button
                    key={gear.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      addGearToTrip(selectedTrip.id, gear.id, selectedBag);
                    }}
                    disabled={isUnavailable}
                    className={`w-full rounded-xl p-4 flex items-center justify-between border transition-all ${
                      isUnavailable 
                        ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed' 
                        : 'bg-gray-50 hover:bg-green-50 hover:border-green-200 border-transparent active:scale-98'
                    }`}
                  >
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm ${isUnavailable ? 'text-gray-500' : 'text-gray-800'}`}>
                          {gear.brand} {gear.name}
                        </p>
                        {gear.isBaseCamp && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            ⛺ BC
                          </span>
                        )}
                        {gear.quantity > 1 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isUnavailable 
                              ? 'bg-red-100 text-red-700' 
                              : available === 1 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isUnavailable ? 'All in use' : `${available} left`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{gear.category} • {gear.weight} lbs</p>
                    </div>
                    {!isUnavailable && <Plus size={22} className="text-green-600 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const TripSummaryModal = () => {
    if (!selectedTrip) return null;

    // Always get fresh trip data from trips array
    const currentTrip = trips.find(t => t.id === selectedTrip.id);
    if (!currentTrip) return null;

    // Collect all gear from all bags
    const allTripGear = [];
    Object.entries(currentTrip.bagAssignments).forEach(([bagId, gearIds]) => {
      const bag = bags.find(b => b.id === bagId);
      gearIds.forEach(gearId => {
        const gear = gearLibrary.find(g => g.id === gearId);
        if (gear) {
          allTripGear.push({ ...gear, bagId, bagName: bag?.name });
        }
      });
    });

    // Group by category
    const gearByCategory = {};
    allTripGear.forEach(gear => {
      if (!gearByCategory[gear.category]) {
        gearByCategory[gear.category] = [];
      }
      gearByCategory[gear.category].push(gear);
    });

    const totalWeight = calculateTripWeight(currentTrip.id);
    const baseCampWeight = calculateBaseCampWeight(currentTrip.id);
    const packInWeight = calculatePackInWeight(currentTrip.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Trip Summary</h3>
              <p className="text-sm text-gray-600">{currentTrip.name}</p>
            </div>
            <button onClick={() => setShowTripSummary(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          {/* Weight Overview */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
              <p className="text-xs text-blue-700 mb-1">Total Weight</p>
              <p className="text-2xl font-bold text-blue-900">{totalWeight.toFixed(1)}</p>
              <p className="text-xs text-blue-600">lbs</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-500">
              <p className="text-xs text-green-700 mb-1">Pack-In Weight</p>
              <p className="text-2xl font-bold text-green-900">{packInWeight.toFixed(1)}</p>
              <p className="text-xs text-green-600">lbs</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border-l-4 border-orange-500">
              <p className="text-xs text-orange-700 mb-1">Base Camp</p>
              <p className="text-2xl font-bold text-orange-900">{baseCampWeight.toFixed(1)}</p>
              <p className="text-xs text-orange-600">lbs</p>
            </div>
          </div>

          {/* Bags Overview */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Bags</h4>
            <div className="grid grid-cols-2 gap-3">
              {bags.map(bag => {
                const weight = calculateBagWeight(currentTrip.id, bag.id);
                const itemCount = getBagItemCount(currentTrip.id, bag.id);
                return (
                  <div key={bag.id} className={`${bagColors[bag.color].bg} rounded-xl p-3`}>
                    <p className={`font-semibold ${bagColors[bag.color].text}`}>{bag.name}</p>
                    <p className="text-sm text-gray-700 mt-1">{weight.toFixed(1)} / {bag.maxWeight} lbs</p>
                    <p className="text-xs text-gray-600">{itemCount} items</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gear by Category */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">All Gear by Category</h4>
            <div className="space-y-4">
              {Object.keys(gearByCategory).sort().map(category => {
                const categoryGear = gearByCategory[category];
                const categoryWeight = categoryGear.reduce((sum, g) => sum + g.weight, 0);
                
                return (
                  <div key={category} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold text-gray-800">{category}</h5>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{categoryGear.length} items</p>
                        <p className="font-bold text-gray-800">{categoryWeight.toFixed(1)} lbs</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {categoryGear.map((gear, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-gray-800">{gear.brand} {gear.name}</p>
                              {gear.isBaseCamp && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                  ⛺
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">in {gear.bagName}</p>
                          </div>
                          <p className="font-semibold text-gray-700">{gear.weight} lbs</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {allTripGear.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-50" />
              <p>No gear packed yet</p>
              <p className="text-sm mt-1">Start adding gear to your bags</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Bottom Navigation
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-bottom">
      <div className="max-w-4xl mx-auto flex justify-around">
        {[
          { id: 'dashboard', icon: Target, label: 'Home' },
          { id: 'packing', icon: Package, label: 'Pack' },
          { id: 'gear', icon: Settings, label: 'Gear' },
          { id: 'trips', icon: Calendar, label: 'Trips' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveScreen(tab.id)}
            className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
              activeScreen === tab.id
                ? 'text-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={24} />
            <span className="text-xs mt-1 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-4xl mx-auto p-4">
        {activeScreen === 'dashboard' && <DashboardScreen />}
        {activeScreen === 'packing' && <PackingScreen />}
        {activeScreen === 'gear' && <GearLibraryScreen />}
        {activeScreen === 'trips' && <TripsScreen />}
      </div>
      
      <BottomNav />
      
      {showAddGear && <AddGearModal />}
      {showEditGear && <EditGearModal />}
      {showAddTrip && <AddTripModal />}
      {showGearPicker && <GearPickerModal />}
      {showManageBags && <ManageBagsModal />}
      {showTripSummary && <TripSummaryModal />}
    </div>
  );
}