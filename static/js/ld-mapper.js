($ => {

    /*==================================================================
    [ Generate and show JSON-LD script ]*/
    var json = {
        "@context": {
            "xsd": "http://www.w3.org/2001/XMLSchema#",
            "schema": "http://schema.org/",
            "mv": "http://schema.mobivoc.org/",
            "dct": "http://purl.org/dc/terms#",
            "dbo": "http://dbpedia.org/ontology/",
            "gr": "http://purl.org/goodrelations/v1#",
            "vp": "http://openvelopark.be/vocabulary/",
            "PostalAddress": "schema:PostalAddress",
            "GeoCoordinates": "schema:GeoCoordinates",
            "GeoShape": "schema:GeoShape",
            "Map": "schema:Map",
            "ContactPoint": "schema:ContactPoint",
            "WebSite": "schema:WebSite",
            "PriceSpecification": "schema:PriceSpecification",
            "Photograph": "schema:Photograph",
            "Place": "schema:Place",
            "BicycleParkingStation": "mv:BicycleParkingStation",
            "Entrance": "mv:ParkingFacilityEntrance",
            "Exit": "mv:ParkingFacilityExit",
            "RealTimeCapacity": "mv:RealTimeCapacity",
            "TimeSpecification": "mv:TimeSpecification",
            "PermanentPersonnelSupervision": "vp:PermanentPersonnelSupervision",
            "LimitedPersonnelSupervision": "vp:LimitedPersonnelSupervision",
            "NoPersonnelSupervision": "vp:NoPersonnelSupervision",
            "NeighborhoodParking": "vp:NeighborhoodParking",
            "BicycleCase": "vp:BicycleCase",
            "AllowedBicycle": "vp:AllowedBicycle",
            "RegularBicycle": "vp:RegularBicycle",
            "ElectricBicycle": "vp:ElectricBicycle",
            "CargoBicycle": "vp:CargoBicycle",
            "TandemBicycle": "vp:TandemBicycle",
            "CameraSurveillance": "vp:CameraSurveillance",
            "ElectronicAccess": "vp:ElectronicAccess",
            "BicyclePump": "vp:BicyclePump",
            "MaintenanceService": "vp:MaintenanceService",
            "ChargingPoint": "vp:ChargingPoint",
            "LockerService": "vp:LockerService",
            "ToiletService": "vp:ToiletService",
            "BikeRentalService": "vp:BikeRentalService",
            "BusinessEntity": "gr:BusinessEntity",
            "address": "schema:address",
            "geo": "schema:geo",
            "map": "schema:hasMap",
            "url": "schema:url",
            "image": "schema:image",
            "contactPoint": "schema:contactPoint",
            "interactionService": "schema:interactionService",
            "capacity": "mv:capacity",
            "dueForTime": "mv:dueForTime",
            "ownedBy": "mv:ownedBy",
            "operatedBy": "mv:operatedBy",
            "dataOwner": "vp:dataOwner",
            "rights": "dct:rights",
            "description": {
                "@id": "schema:description",
                "@type": "xsd:string"
            },
            "dateModified": {
                "@id": "schema:dateModified",
                "@type": "xsd:dateTime"
            },
            "name": {
                "@id": "schema:name",
                "@container": "@set"
            },
            "value": {
                "@id": "schema:value",
                "@type": "xsd:boolean"
            },
            "postalCode": {
                "@id": "schema:postalCode",
                "@type": "xsd:integer"
            },
            "streetAddress": {
                "@id": "schema:streetAddress",
                "@type": "xsd:string"
            },
            "polygon": {
                "@id": "schema:polygon",
                "@type": "xsd:string"
            },
            "latitude": {
                "@id": "schema:latitude",
                "@type": "xsd:double"
            },
            "longitude": {
                "@id": "schema:longitude",
                "@type": "xsd:double"
            },
            "startDate": {
                "@id": "schema:startDate",
                "@type": "xsd:dateTime"
            },
            "endDate": {
                "@id": "schema:endDate",
                "@type": "xsd:dateTime"
            },
            "openingHours": {
                "@id": "schema:openingHours",
                "@type": "xsd:string"
            },
            "contactType": {
                "@id": "schema:contactType",
                "@type": "xsd:string"
            },
            "email": {
                "@id": "schema:email",
                "@type": "xsd:string"
            },
            "telephone": {
                "@id": "schema:telephone",
                "@type": "xsd:string"
            },
            "availableLanguage": {
                "@id": "schema:availableLanguage",
                "@container": "@set"
            },
            "publicAccess": {
                "@id": "schema:publicAccess",
                "@type": "xsd:boolean"
            },
            "priceSpecification": {
                "@id": "schema:priceSpecification",
                "@container": "@set"
            },
            "price": {
                "@id": "schema:price",
                "@type": "xsd:double"
            },
            "currency": {
                "@id": "schema:priceCurrency",
                "@type": "xsd:string"
            },
            "amenityFeature": {
                "@id": "schema:amenityFeature",
                "@container": "@set"
            },
            "photos": {
                "@id": "schema:photos",
                "@container": "@set"
            },
            "entrance": {
                "@id": "mv:entrance",
                "@container": "@set"
            },
            "exit": {
                "@id": "mv:exit",
                "@container": "@set"
            },
            "numberOfLevels": {
                "@id": "mv:numberOfLevels",
                "@type": "xsd:integer"
            },
            "totalCapacity": {
                "@id": "mv:totalCapacity",
                "@type": "xsd:integer"
            },
            "currentValue": {
                "@id": "mv:currentValue",
                "@type": "xsd:integer"
            },
            "freeOfCharge": {
                "@id": "mv:freeOfCharge",
                "@type": "xsd:boolean"
            },
            "overnight": {
                "@id": "mv:overnight",
                "@type": "xsd:boolean"
            },
            "timeStartValue": {
                "@id": "mv:timeStartValue",
                "@type": "xsd:double"
            },
            "timeEndValue": {
                "@id": "mv:timeEndValue",
                "@type": "xsd:double"
            },
            "timeUnit": {
                "@id": "mv:timeUnit",
                "@type": "xsd:string"
            },
            "allowed": {
                "@id": "vp:allowed",
                "@container": "@set"
            },
            "minimumStorageTime": {
                "@id": "vp:minimumStorageTime",
                "@type": "xsd:duration"
            },
            "maximumStorageTime": {
                "@id": "vp:maximumStorageTime",
                "@type": "xsd:duration"
            },
            "intendedAudience": {
                "@id": "vp:intendedAudience",
                "@type": "xsd:string"
            },
            "restrictions": {
                "@id": "vp:restrictions",
                "@type": "xsd:string"
            },
            "removalConditions": {
                "@id": "vp:removalConditions",
                "@type": "xsd:string"
            },
            "postRemovalAction": {
                "@id": "vp:postRemovalAction",
                "@type": "xsd:string"
            },
            "bicycleType": {
                "@id": "vp:bicycleType",
                "@type": "@id"
            },
            "bicyclesAmount": {
                "@id": "vp:bicyclesAmount",
                "@type": "xsd:integer"
            },
            "countingSystem": {
                "@id": "vp:countingSystem",
                "@type": "xsd:boolean"
            },
            "companyName": {
                "@id": "gr:legalName",
                "@type": "xsd:string"
            },
            "identifier": {
                "@id": "dct:identifier",
                "@type": "xsd:string"
            },
            "date": {
                "@id": "dct:date",
                "@type": "xsd:dateTime"
            },
            "closeTo": {
                "@id": "dbo:closeTo",
                "@container": "@set"
            }
        },
        "@id": "http://data.gent.be/parking/bikes/546213",
        "@type": "BicycleParkingStation",
        "dateModified": "2019-01-20T08:35:15.000Z",
        "dataOwner": {
            "@id": "https://fietsambassade.gent.be",
            "@type": "BusinessEntity",
            "companyName": "Fietsambassade Gent"
        },
        "identifier": "546213",
        "name": [
            {
                "@value": "Gent Sint-Pieters",
                "@language": "nl"
            },
            {
                "@value": "Gand Saint-Pierre",
                "@language": "fr"
            }
        ],
        "totalCapacity": 450,
        "capacity": {
            "@type": "RealTimeCapacity",
            "currentValue": 133,
            "date": "2018-11-08T14:42:00.000Z"
        },
        "ownedBy": {
            "@id": "https://www.wikidata.org/wiki/Q1296",
            "@type": "BusinessEntity",
            "companyName": "Stad Gent"
        },
        "operatedBy": {
            "@id": "https://www.wikidata.org/wiki/Q524255",
            "@type": "BusinessEntity",
            "companyName": "NMBS"
        },
        "address": {
            "@id": "http://data.vlaanderen.be/id/adres/243766",
            "@type": "PostalAddress",
            "postalCode": 9000,
            "streetAddress": "Koningin Maria Hendrikaplein 1",
            "description": "Onder Gent Sint-Pieters trein station"
        },
        "geo": [
            {
                "@type": "GeoCoordinates",
                "latitude": 51.0369388,
                "longitude": 3.7078917
            },
            {
                "@type": "GeoShape",
                "polygon": "POLYGON ((30 10, 40 40, 20 40, 10 20))"
            }
        ],
        "map": {
            "@type": "Map",
            "url": "http://parking.nmbs.be/gent-sint-pieters/map.png"
        },
        "closeTo": [
            {
                "@type": "Place",
                "name": [
                    {
                        "@value": "Grote Markt",
                        "@language": "nl"
                    }
                ]
            }
        ],
        "startDate": "1996-11-23T08:00:00.000Z",
        "endDate": "2050-12-31T23:59:59.000Z",
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "email": "parking@nmbs.be",
            "telephone": "+3292101010",
            "availableLanguage": ["nl", "fr", "en"],
            "openingHours": "Mo,Tu,We,Th,Fr 09:00-17:00"
        },
        "interactionService": {
            "@type": "WebSite",
            "url": "http://parking.nmbs.be/gent-sint-pieters"
        },
        "photos": [
            {
                "@type": "Photograph",
                "image": "http://data.gent.be/pic/546213_1.png",
                "description": "Facility entrance."
            },
            {
                "@type": "Photograph",
                "image": "http://data.gent.be/pic/546213_2.png",
                "description": "Bicycle pump."
            }
        ],
        "rights": "https://tinyurl.com/yb3ywacm",
        "@graph": [
            {
                "@id": "http://data.gent.be/parking/bikes/546213#secured",
                "@type": "PermanentPersonnelSupervision",
                "openingHours": "Mo,Tu,We,Th 09:00-12:00",
                "maximumStorageTime": "P30D",
                "publicAccess": false,
                "intendedAudience": "Residents in Ghent",
                "restrictions": "Only one bicycle per resident",
                "removalConditions": "Bicycle left outside parking racks. Bicycle left for more than 30 days.",
                "postRemovalAction": "Contact APCOA on 0473 33 89 11",
                "numberOfLevels": 2,
                "totalCapacity": 250,
                "capacity": {
                    "@type": "RealTimeCapacity",
                    "currentValue": 133,
                    "date": "2018-11-08T14:42:00.000Z"
                },
                "allowed": [
                    {
                        "@type": "AllowedBicycle",
                        "bicycleType": "vp:RegularBicycle",
                        "bicyclesAmount": 100,
                        "countingSystem": true
                    },
                    {
                        "@type": "AllowedBicycle",
                        "bicycleType": "vp:ElectricBicycle",
                        "bicyclesAmount": 100,
                        "countingSystem": true
                    },
                    {
                        "@type": "AllowedBicycle",
                        "bicycleType": "vp:CargoBicycle",
                        "bicyclesAmount": 50,
                        "countingSystem": true
                    }
                ],
                "geo": [
                    {
                        "@type": "GeoCoordinates",
                        "latitude": 51.0369388,
                        "longitude": 3.7078917
                    },
                    {
                        "@type": "GeoShape",
                        "polygon": "POLYGON ((30 10, 40 40, 20 40, 10 20))"
                    }
                ],
                "entrance": [
                    {
                        "@type": "Entrance",
                        "geo": {
                            "@type": "GeoCoordinates",
                            "latitude": 51.0369388,
                            "longitude": 3.7078917
                        },
                        "description": "U rijdt de parking binnen via de Pakhuisstraat, naast het voormalige postgebouw"
                    }
                ],
                "priceSpecification": [
                    {
                        "@type": "PriceSpecification",
                        "freeOfCharge": true,
                        "price": 0.00,
                        "currency": "EUR",
                        "url": "http://parking.nmbs.be/parking/prices",
                        "dueForTime": {
                            "@type": "TimeSpecification",
                            "overnight": false,
                            "timeStartValue": 0.0,
                            "timeEndValue": 1.0,
                            "timeUnit": "hour"
                        },
                        "description": "Free for the first hour"
                    },
                    {
                        "@type": "PriceSpecification",
                        "freeOfCharge": false,
                        "price": 3.00,
                        "priceCurrency": "EUR",
                        "url": "http://parking.nmbs.be/parking/prices",
                        "dueForTime": {
                            "@type": "TimeSpecification",
                            "overnight": false,
                            "timeStartValue": 1.0,
                            "timeEndValue": 2.0,
                            "timeUnit": "hour"
                        },
                        "description": "Each hour after the first costs 3 EUR"
                    }
                ],
                "amenityFeature": [
                    {
                        "@type": "CameraSurveillance",
                        "value": true
                    },
                    {
                        "@type": "BicyclePump",
                        "value": true
                    },
                    {
                        "@type": "MaintenanceService",
                        "value": false
                    }
                ]
            },
            {
                "@id": "http://data.gent.be/parking/bikes/546213#unsecured",
                "@type": "NoPersonnelSupervision",
                "openingHours": "Mo,Tu,We,Th 09:00-12:00",
                "maximumStorageTime": "P90D",
                "publicAccess": true,
                "intendedAudience": "General public",
                "removalConditions": "Bicycle left for more than 90 days.",
                "postRemovalAction": "Contact APCOA on 0473 33 89 11",
                "numberOfLevels": 1,
                "totalCapacity": 200,
                "capacity": {
                    "@type": "RealTimeCapacity",
                    "currentValue": 133,
                    "date": "2018-11-08T14:42:00.000Z"
                },
                "allowed": [
                    {
                        "@type": "AllowedBicycle",
                        "bicycleType": "vp:RegularBicycle",
                        "bicyclesAmount": 100,
                        "countingSystem": false
                    },
                    {
                        "@type": "AllowedBicycle",
                        "bicycleType": "vp:ElectricBicycle",
                        "bicyclesAmount": 100,
                        "countingSystem": false
                    }
                ],
                "geo": [
                    {
                        "@type": "GeoCoordinates",
                        "latitude": 51.0369388,
                        "longitude": 3.7078917
                    },
                    {
                        "@type": "GeoShape",
                        "polygon": "POLYGON ((30 10, 40 40, 20 40, 10 20))"
                    }
                ],
                "entrance": [
                    {
                        "@type": "Entrance",
                        "geo": {
                            "@type": "GeoCoordinates",
                            "latitude": 51.0369388,
                            "longitude": 3.7078917
                        },
                        "description": "U rijdt de parking binnen via de Pakhuisstraat, naast het voormalige postgebouw"
                    }
                ],
                "priceSpecification": [
                    {
                        "@type": "PriceSpecification",
                        "freeOfCharge": true,
                        "price": 0.00,
                        "currency": "EUR",
                        "url": "http://parking.nmbs.be/parking/prices",
                        "dueForTime": {
                            "@type": "TimeSpecification",
                            "overnight": true,
                            "timeStartValue": 0.0,
                            "timeEndValue": 90.0,
                            "timeUnit": "day"
                        },
                        "description": "Free for 90 days"
                    }
                ],
                "amenityFeature": [
                    {
                        "@type": "CameraSurveillance",
                        "value": false
                    },
                    {
                        "@type": "BicyclePump",
                        "value": true
                    },
                    {
                        "@type": "MaintenanceService",
                        "value": false
                    }
                ]
            }
        ]
    };
    $('#ld-script').html(JSON.stringify(json, null, 4));

    $('#ld_generate').on('click', () => {
        var check = true;

        for (var i = 0; i < input.length; i++) {
            if (validate(input[i]) == false) {
                showValidate(input[i]);
                check = false;
            }
        }
        if (check) {
            $('.overlay').toggle();
            $('.jsonld').toggle();
        }

        return false;
    });

    $('#close_button').on('click', () => {
        $('.overlay').toggle();
        $('.jsonld').toggle();
    });
    
})(jQuery);