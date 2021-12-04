import {Component} from '@angular/core';
import {ModalController, NavController} from 'ionic-angular';
import {AppPreferences} from "@ionic-native/app-preferences";
import {Geolocation} from "@ionic-native/geolocation";
import firebase from 'firebase';
import {DetailPage} from "../detail/detail";
import {LaunchNavigator} from '@ionic-native/launch-navigator';

declare let GeoFire;
declare let require;

@Component({
  selector: 'page-profile',
  templateUrl: 'profile.html'
})
export class ProfilePage {

  /*
  title:
  description:
  gravity:
  date:
  timestamp:
  segnalationId:
  userId:
  distance:
  solved:
  location: Array[lat,long]
  userImage:
  userFirstName:
  userLastName:
  likes:
  dislikes:
  image:
  */

  private monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  private userLogged: string;
  private userData: any;
  private segnalationOfUser: any[] = [];
  private userLikesDislikes: any[] = [];

  private filter: string;
  private cardItems: any[] = [];

  private storage = firebase.storage();
  private database = firebase.database();
  private dbRefLocations = this.database.ref('locations');
  private dbRefSegnalations = this.database.ref('/segnalations/');
  private dbRefLikeDislike = this.database.ref('/likesDislikes/');
  private geoFire = new GeoFire(this.dbRefLocations);
  private geoQuery: any;
  private currentPosition: any;

  constructor(public navCtrl: NavController, private appPreferences: AppPreferences, public geoLocation: Geolocation, public modalCtrl: ModalController,
              private launchNavigator: LaunchNavigator) {
    this.filter = "all";
    this.appPreferences.fetch("logged", "logged").then((userLogged) => {
      this.database.ref('/users/' + userLogged).once('value').then((snapshot) => {
        this.userData = {
          email: snapshot.val().email,
          firstName: snapshot.val().firstName,
          lastName: snapshot.val().lastName,
          profilePic: snapshot.val().profilePic,
          userId: userLogged
        };
        this.userLogged = userLogged;
        this.setupList();
      });
    });
  }

  ionViewWillUnload(){
    this.removeRef();
    this.cardItems.length = 0; //Pulisce la lista di segnalazioni
    this.segnalationOfUser.length = 0;
    this.userLikesDislikes.length = 0
  }

  setupList(){

    this.geoLocation.getCurrentPosition().then((position) => {

      this.currentPosition = position;
      this.cardItems.length = 0; //Pulisce la lista
      this.dbRefSegnalations.orderByChild("user").equalTo(this.userData.userId).on('child_added', (snapshot) => {  //preleva i dati già presenti e quelli nuovi
        let segnalationId = snapshot.key;
        this.segnalationOfUser.push(segnalationId);

        this.geoQuery = this.geoFire.query({
          center: [position.coords.latitude, position.coords.longitude],
          radius: 1000
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
              distanceToShow: this.getDistance(distance)
            };
            this.getUserOfSegnalation(item);
            this.createLikeListenerOfSegnalation(item);
            this.getImageOfSegnalation(item);
          }
        });
      });

      this.dbRefSegnalations.orderByChild("user").equalTo(this.userData.userId).on("child_changed", (snapshot) => {
        this.geoQuery.on("key_entered", (geoQueryKey, location, distance) => {
          let segnalationId = snapshot.key;
          if (geoQueryKey === segnalationId) {
            for (let i = 0; i < this.cardItems.length; i++) {
              if (this.cardItems[i].segnalationId === segnalationId) {
                this.cardItems[i].solved = snapshot.val().solved;
              }
            }
          }
        });
      });
      this.getNumberOfUserVotes();
    });
  }

  getDistance(distance) {
    if (distance < 1) {
      return Math.round(distance * 1000)  + " m";
    } else {
      return Math.round(distance) + " km";
    }
  }

  removeRef(){
    this.dbRefSegnalations.off();
    this.dbRefLikeDislike.off();
    if (this.geoQuery !== undefined){
      this.geoQuery.cancel();
    }
  }

  getImageOfSegnalation(item) {
    let pathReference = this.storage.ref("images/" + item.segnalationId + ".jpg");
    pathReference.getDownloadURL().then((url) => {
      item["image"] = url;
      this.cardItems.push(item);
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
        if (childSnapshot.val().userId == this.userData.userId && childSnapshot.val().value){
          userchoice = 1;
        } else if (childSnapshot.val().userId == this.userData.userId && !childSnapshot.val().value){
          userchoice = -1;
        }
        if (childSnapshot.val().value) {
          likesCounter++;
        }
        if (!childSnapshot.val().value) {
          dislikesCounter++;
        }
        return false;
      });
      item["userchoice"] = userchoice;
      item["likes"] = likesCounter;
      item["dislikes"] = dislikesCounter;
    });
  }

  getNumberOfUserVotes() { //cambiarla con tutti i like ricevuti da altri utenti
    this.dbRefLikeDislike.on('value', (snapshot) => {
      let count_likes = 0;
      let count_dislikes = 0;
      snapshot.forEach((childSnapshot) => {
        if (this.segnalationOfUser.indexOf(childSnapshot.val().segnalationId) != -1){
          if (childSnapshot.val().value) {
            count_likes++;
          }else{
            count_dislikes++;
          }
        }
        return false;
      });
      this.userLikesDislikes["likes"] = count_likes;
      this.userLikesDislikes["dislikes"] = count_dislikes;
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

  showSegnalation(segnalation : any){
    this.modalCtrl.create(DetailPage, { segnalation: segnalation }).present();
  }

  openMaps(destination) {
    this.launchNavigator.navigate(destination, {
      start: this.currentPosition.coords.latitude + ", " +  this.currentPosition.coords.longitude
    })
  }

  likeClicked(segnalationId, likeOrDislike) {
    let uuid = require("uuid");
    let id = uuid.v4();
    this.dbRefLikeDislike.once('value').then((snapshot) => {
      if (snapshot.exists()) { //se la tabella like è stata creata cerco se l'utente ha gia messo una valutazione per la segnalazione data
        let i = 0;
        let found = false;
        snapshot.forEach((childSnapshot) => {
          if (childSnapshot.val().userId == this.userLogged && childSnapshot.val().segnalationId == segnalationId) { //l'utente ha gia espresso una valutazione per questa segnalazione
            found = true;
            if (childSnapshot.val().value == likeOrDislike) { //se la valutazione espressa è uguale a quella gia presente, la cancello
              this.database.ref('/likesDislikes/' + Object.keys(snapshot.val())[i]).remove();
            } else { //se la valutazione espressa è diversa da quella gia presente, la setto.
              this.database.ref('/likesDislikes/' + Object.keys(snapshot.val())[i]).set({
                userId: this.userLogged,
                segnalationId: segnalationId,
                value: likeOrDislike
              });
            }
          }
          i++;
          return false;
        });
        if (!found) { //l'utente non ha espresso una valutazione per questa segnalazione, quindi la creo
          this.database.ref('/likesDislikes/' + id).set({
            userId: this.userLogged,
            segnalationId: segnalationId,
            value: likeOrDislike
          });
        }
      } else { //se la tabella non c'è la creo con la prima valutazione passata come parametro
        this.database.ref('/likesDislikes/' + id).set({
          userId: this.userLogged,
          segnalationId: segnalationId,
          value: likeOrDislike
        });
      }
    });
  }

}
