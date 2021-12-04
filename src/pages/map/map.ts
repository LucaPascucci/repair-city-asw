import {Component} from '@angular/core';
import {ActionSheetController, FabContainer, ModalController, NavController, Platform} from 'ionic-angular';
import {Geolocation} from "@ionic-native/geolocation";
import {AddPage} from "../add/add";
import * as firebase from "firebase";
import {
  GoogleMaps,
  GoogleMap,
  GoogleMapOptions,
  Marker,
  LatLng,
  HtmlInfoWindow,
  GoogleMapsEvent
} from '@ionic-native/google-maps';
import {AppPreferences} from "@ionic-native/app-preferences";
import {DetailPage} from "../detail/detail";
import {LaunchNavigator} from "@ionic-native/launch-navigator";

declare let GeoFire;

@Component({
  selector: 'page-map',
  templateUrl: 'map.html'
})
export class MapPage {

  /*
  title:
  description:
  gravity:
  date:
  timestamp:
  segnalationId:
  userId:
  distance:
  location: Array[lat,long]
  userImage:
  userFirstName:
  userLastName:
  likes:
  dislikes:
  image:
  */

  private mapElement: HTMLElement;
  private map: GoogleMap;
  private currentPositionMarker: Marker;
  private currentPosition: LatLng = new LatLng(44.1454289, 12.2474282);
  private markersMap: Map<string, Marker> = new Map<string, Marker>();
  private userLogged: string;

  private range: number;

  private storage = firebase.storage();
  private database = firebase.database();
  private dbRefLocations = this.database.ref('locations');
  private dbRefSegnalations =  this.database.ref('/segnalations/');
  private dbRefLikeDislike =this.database.ref('/likesDislikes/');
  private geoFire = new GeoFire(this.dbRefLocations);
  private geoQuery : any;

  private monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  constructor(public navCtrl: NavController, private geoLocation: Geolocation, private modalCtrl: ModalController, private googleMaps: GoogleMaps, private appPreferences: AppPreferences,
              private actionSheetCtrl: ActionSheetController, private platform: Platform, private launchNavigator: LaunchNavigator) {
    this.appPreferences.fetch('logged','logged').then(res => {
      this.userLogged = res;
    });
    this.appPreferences.fetch('range', 'range').then( res => {
      this.range = res;
    });
  }

  ionViewDidLoad() {
    this.geoLocation.getCurrentPosition().then((position) => {
      this.currentPosition = new LatLng(position.coords.latitude, position.coords.longitude);
      this.loadMap()
    });
  }

  //Runs when the page has fully entered and is now the active page. This event will fire, whether it was the first load or a cached page
  ionViewDidEnter(){
    this.appPreferences.fetch('range', 'range').then( res => {
      if (this.range !== res){
        this.range = res;
        this.removeRef();
        this.setupList();
      }
    });
  }

  //Runs when the page is about to be destroyed and have its elements removed.
  ionViewWillUnload(){
    this.removeRef();
    this.markersMap.clear(); //Pulisce la lista di marker
    this.map.clear();
    this.map.remove();
  }

  setupList() {
    this.markersMap.forEach((marker: Marker, key: string) => {  //Pulisco marker dalla mappa
      marker.remove();
    });
    this.markersMap.clear(); //Pulisce la lista di marker
    this.dbRefSegnalations.on('child_added', (snapshot) => {

      if (!snapshot.val().solved) { //visualizzo solo le segnalazioni risolte
        let segnalationId = snapshot.key;

        this.geoQuery = this.geoFire.query({
          center: [this.currentPosition.lat, this.currentPosition.lng],
          radius: this.range
        });
        this.geoQuery.on("key_entered", (key, location, distance) => { //distanza data in km

          if (key == segnalationId) {
            let item = {
              title: snapshot.val().title,
              description: snapshot.val().description,
              gravity: snapshot.val().gravity,
              date: this.getDate(snapshot.val().timestamp),
              timestamp: snapshot.val().timestamp,
              segnalationId: segnalationId,
              userId: snapshot.val().user,
              solved: snapshot.val().solved,
              location: location,
              distance: distance,
            };
            this.getUserOfSegnalation(item);
            this.createLikeListenerOfSegnalation(item);
            this.getImageOfSegnalation(item);
          }
        });
      }
    });

    this.dbRefSegnalations.on("child_changed", (snapshot) => {
      this.geoQuery.on("key_entered", (geoQueryKey, location, distance) => {
        let segnalationId = snapshot.key;
        if (geoQueryKey === segnalationId) {
          if (snapshot.val().solved) { //mi è cambiata una segnalazione da non risolta a risolta, la cancello dalla lista
            this.markersMap.get(segnalationId).remove();
            this.markersMap.delete(segnalationId);
          } else { //mi è cambiata una segnalazione da risolta a non risolta, la devo riscaricare e aggiungerla alla lista
            let item = {
              title: snapshot.val().title,
              description: snapshot.val().description,
              gravity: snapshot.val().gravity,
              date: this.getDate(snapshot.val().timestamp),
              timestamp: snapshot.val().timestamp,
              segnalationId: segnalationId,
              solved: snapshot.val().solved,
              userId: snapshot.val().user,
              location: location,
              distance: distance,
            };
            this.getUserOfSegnalation(item);
            this.createLikeListenerOfSegnalation(item);
            this.getImageOfSegnalation(item);
          }
        }
      });
    });
  }

  getImageOfSegnalation(item) {
    let pathReference = this.storage.ref("images/" + item.segnalationId + ".jpg");
    pathReference.getDownloadURL().then((url) => {
      item["image"] = url;
      this.addMarker(item);
    });
  }

  getUserOfSegnalation(item) {
    this.database.ref('/users/' + item.userId).once('value').then((snapshot) => {
      item["userImage"] = snapshot.val().profilePic;
      item["userFirstName"] = snapshot.val().firstName;
      item["userLastName"] = snapshot.val().lastName;
    });
  }

  createLikeListenerOfSegnalation(item) {
    this.dbRefLikeDislike.orderByChild("segnalationId").equalTo(item.segnalationId).on('value', (snapshot) => {
      let likesCounter = 0;
      let dislikesCounter = 0;
      let userchoice = 0;
      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val().userId == this.userLogged && childSnapshot.val().value){
          userchoice = 1;
        } else if (childSnapshot.val().userId == this.userLogged && !childSnapshot.val().value){
          userchoice = -1;
        }
        if(childSnapshot.val().value) {
          likesCounter++;
        }
        if(!childSnapshot.val().value) {
          dislikesCounter++;
        }
        return false;
      });
      item["userchoice"] = userchoice;
      item["likes"] = likesCounter;
      item["dislikes"] = dislikesCounter;
    });
  }

  getDate(timestamp) {
    let today = new Date(timestamp);
    let dd = today.getDate();
    let mm = this.monthNames[today.getMonth()];
    let yyyy = today.getFullYear();
    let m = today.getMinutes();
    let h = today.getHours();

    let hour;
    let minutes;

    if (h < 10) {
      hour = "0" + h;
    } else {
      hour = h
    }

    if (m < 10) {
      minutes = "0" + m;
    } else {
      minutes = m;
    }
    return dd + " " + mm + " " + yyyy + " " + hour + ":" + minutes;
  }

  removeRef(){
    this.dbRefSegnalations.off();
    this.dbRefLikeDislike.off();
    if (this.geoQuery !== undefined){
      this.geoQuery.cancel();
    }
  }

  loadMap() {
    this.mapElement = document.getElementById('map');
    let mapOptions: GoogleMapOptions = {
      camera: {
        target: this.currentPosition,
        zoom: 15
      },
      controls: {
        compass: false,
        myLocationButton: false,
        indoorPicker: false,
        mapToolbar: false,
        zoom: false,
      },
      mapType: "MAP_TYPE_NORMAL"
    };

    this.map = this.googleMaps.create(this.mapElement, mapOptions);
    this.map.one(GoogleMapsEvent.MAP_READY).then(() => {
      this.map.addMarker({
        position: this.currentPosition,
        icon: {
          url: './assets/positionmarker.png',
          size: {
            width: 32,
            height: 32
          }
        }
      }).then((marker) => { //quando il marker è stato aggiunto, lo salvo per trackerlo e mi sposto sulla sua posizione
        this.currentPositionMarker = marker;
        this.map.setCameraTarget(this.currentPosition);
        this.setupList();
      });
      this.geoLocation.watchPosition().subscribe( (position) => {
        this.currentPosition = new LatLng(position.coords.latitude, position.coords.longitude);
        if (this.currentPositionMarker !== undefined) {
          this.currentPositionMarker.setPosition(this.currentPosition);
        }
      });
    });
  }

  addMarker(item) {
    let htmlInfoWindow = new HtmlInfoWindow();
    let description;
    if (item.description.length > 40) {
      description = item.description.substring(0, 40) + "...";
    } else {
      description = item.description;
    }
    let div = document.createElement("div");
    div.style.width = "150px";
    let html =
      '<div>' +
        '<div style="margin-left:5px;text-align:center;padding-bottom:10px">'+
          '<b>'+item.title+'</b>'+
          '<br>'+
          '<span>'+description+'</span>'+
        '</div>'+
      '<img src="'+ item.image+'" style="margin:5px">'+
      '</div>';
    div.innerHTML = html;
    div.addEventListener("click", () => {
      this.showActionSheet(item);
    });
    htmlInfoWindow.setContent(div);
    this.map.addMarker({
      position: {
        lat: item.location[0],
        lng: item.location[1]
      },
      icon: {
        url: './assets/' + item.gravity + '.png',
        size: {
          width: 32,
          height: 32
        }
      }
    }).then((marker: Marker) => {
      this.markersMap.set(item.segnalationId, marker);
      marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(() => {
        htmlInfoWindow.open(marker);
      });
    });
  }

  showActionSheet(item) {
    const actionSheet = this.actionSheetCtrl.create({
      title: '',
      cssClass: 'action-sheets',
      buttons: [
        {
          text: 'Naviga al punto',
          icon: this.platform.is('ios')? null : 'navigate',
          handler: () => {
            this.openMaps(item.location);
          }
        },
        {
          text: 'Mostra dettaglio segnalazione',
          icon: this.platform.is('ios')? null : 'information-circle',
          handler: () => {
            this.showSegnalation(item);
          }
        },
        {
          text: 'Annulla',
          icon:  this.platform.is('ios') ? null : 'close',
          role: 'destructive',
        }
      ]
    });
    actionSheet.present();
  }

  fabMapPressed(buttonPressed: string, fab: FabContainer) {
    fab.close();
    if (buttonPressed == "standard") {
      this.map.setMapTypeId("MAP_TYPE_NORMAL");
    } else if (buttonPressed == "hybrid") {
      this.map.setMapTypeId("MAP_TYPE_HYBRID");
    } else if (buttonPressed == "satellite") {
      this.map.setMapTypeId("MAP_TYPE_SATELLITE");
    }
  }

  fabAddPressed() {
    this.modalCtrl.create(AddPage).present();
  }

  fabCenterPressed() {
    this.map.animateCamera({
      target: this.currentPosition,
      duration: 2000,
      zoom: 15
    });
  }

  showSegnalation(segnalation : any){
    this.modalCtrl.create(DetailPage, { segnalation: segnalation }).present();
  }

  openMaps(destination) {
    this.launchNavigator.navigate(destination, {
      start: this.currentPosition.lat + ", " +  this.currentPosition.lng
    })
  }

}
