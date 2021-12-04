import {Component, ElementRef, ViewChild} from '@angular/core';
import {ActionSheetController, NavController, Platform} from 'ionic-angular';
import {Geolocation} from "@ionic-native/geolocation";
import {Camera} from "@ionic-native/camera";
import {Toast} from "@ionic-native/toast";
import {AppPreferences} from "@ionic-native/app-preferences";
import firebase from 'firebase';
import {DomSanitizer} from "@angular/platform-browser";

declare let google;
declare let require;
declare let GeoFire: any;

@Component({
  selector: 'page-add',
  templateUrl: 'add.html'
})
export class AddPage {

  @ViewChild('map') mapElement: ElementRef;
  private map: any;
  private currentPositionMarker: any;
  private currentPosition = new google.maps.LatLng(44.1454289, 12.2474282);
  private gravity: string;
  private imageToShow: any;
  private segTitle: string;
  private segDescription: string;
  private toast: Toast = new Toast;
  private userId: string;

  private imageSrc : any;

  constructor(public navCtrl: NavController, public geoLocation: Geolocation, public actionSheetCtrl: ActionSheetController, private camera: Camera, private appPreferences: AppPreferences, private sanitizer: DomSanitizer, private platform: Platform) {
    this.gravity = "low";
    setInterval(() => this.updatePosition(), 2000) //ogni 2sec leggo la posizione corrente e la aggiorno

  }

  ionViewDidLoad() {
    this.loadMap();
    this.appPreferences.fetch("logged", "logged").then((userId) => {
      this.userId = userId;
    });
  }

  updatePosition() {
    this.geoLocation.getCurrentPosition().then((position) => {
      this.currentPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      if (this.currentPositionMarker !== undefined) {
        this.currentPositionMarker.setPosition(this.currentPosition);
      } else {
        this.currentPositionMarker = new google.maps.Marker({
          position: this.currentPosition,
          map: this.map,
          icon: {
            url: './assets/positionmarker.png',
            scaledSize: new google.maps.Size(32,32)
          }
        });
      }
      this.map.setCenter(this.currentPosition);
    });
  }

  loadMap() {
    let mapOptions = {
      draggable: false,
      scrollWheel: false,
      panControl: false,
      maxZoom: 18,
      minZoom: 18,
      zoom: 18,
      disableDefaultUI: true,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      center: this.currentPosition,
      styles: [{
        featureType: "poi",
        elementType: "labels",
        stylers: [
          { visibility: "off" }
        ]
      }]
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
  }

  showActionSheetPhoto() {
    const actionSheet = this.actionSheetCtrl.create({
      title: 'Scegliere la fonte',
      buttons: [
        {
          text: 'Fotocamera',
          icon: this.platform.is('ios')? null :'camera',
          handler: () => {
            let cameraOptions = {
              sourceType: this.camera.PictureSourceType.CAMERA,
              destinationType: this.camera.DestinationType.DATA_URL,
              quality: 100,
              targetWidth: 1000,
              targetHeight: 1000,
              encodingType: this.camera.EncodingType.JPEG,
              correctOrientation: true
            };

            this.camera.getPicture(cameraOptions)
              .then(file_uri => {
                  this.imageToShow = this.sanitizer.bypassSecurityTrustUrl("data:image/jpg;base64," + file_uri);
                  this.imageSrc = file_uri;
                },
                err => console.log(err));
          }
        },
        {
          text: 'Libreria Foto',
          icon: this.platform.is('ios')? null :'images',
          handler: () => {
            let cameraOptions = {
              sourceType: this.camera.PictureSourceType.PHOTOLIBRARY,
              destinationType: this.camera.DestinationType.DATA_URL,
              quality: 100,
              targetWidth: 1000,
              targetHeight: 1000,
              encodingType: this.camera.EncodingType.JPEG,
              correctOrientation: true
            };

            this.camera.getPicture(cameraOptions)
              .then(file_uri => {
                  this.imageToShow = this.sanitizer.bypassSecurityTrustUrl("data:image/jpg;base64," + file_uri);
                  this.imageSrc = file_uri;
                },
                err => console.log(err));
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

  sendSegnalation() {
    //Controllo che siano presenti titolo, descrizione, foto
    if (!this.segTitle || !this.segTitle.length || !this.segTitle.trim()) {
      this.toast.show("Inserire un titolo", '2000', 'bottom').subscribe();
    } else if (!this.segDescription || !this.segDescription.length || !this.segDescription.trim()) {
      this.toast.show("Inserire una descrizione", '2000', 'bottom').subscribe();
    } else if (!this.imageSrc) {
      this.toast.show("Inserire una foto", '2000', 'bottom').subscribe();
    } else {
      let uuid = require("uuid");
      let id = uuid.v4(); //serve per l'id della segnalazione

      //salvo nello storage di firebase la foto della segnalazione, con nome lo stesso id della segnalazione, in modo tale da poterla ritrovare in futuro.
      const storageRef = firebase.storage().ref();
      const imageRef = storageRef.child('images/' + id + '.jpg');
      imageRef.putString(this.imageSrc, 'base64').then(() => { //creo i record solo una volta che l'immagine è stata caricata
        //creo la segnalazione su firebase con ID utente, titolo, descrizione, gravitÃ 
        const segnalationRef = firebase.database().ref('/segnalations/' + id);
        segnalationRef.set({
          user: this.userId,
          title: this.segTitle,
          gravity: this.gravity,
          description: this.segDescription,
          timestamp: Date.now(),
          solved: false
        });

        //creo il geofire per la segnalazione appena creata su cui poi faro le query geolocalizzate
        const geoFireRef = firebase.database().ref('locations');
        const geoFire = new GeoFire(geoFireRef);
        const location = [this.currentPosition.lat(), this.currentPosition.lng()];
        geoFire.set(id, location);
      });

      this.dismissModal();
    }
  }

  dismissModal() {
    this.navCtrl.pop(); //per tornare nella view precedente
  }

}
