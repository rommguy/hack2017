import wixSite from 'wix-site';
import wixData from 'wix-data';
import wixStorage from 'wix-storage';
import wixUsers from 'wix-users';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import {initWixWhite} from 'public/wix-white';

initWixWhite($w, wixData, wixLocation, wixSite, wixStorage, wixUsers, wixWindow.viewMode);


