import type { Icon, IconProps } from "@phosphor-icons/react";
import {
  ArrowCounterClockwiseIcon as BaseArrowCounterClockwise,
  ArrowDownIcon as BaseArrowDown,
  ArrowDownRightIcon as BaseArrowDownRight,
  ArrowLeftIcon as BaseArrowLeft,
  ArrowLineDownIcon as BaseArrowLineDown,
  ArrowLineUpIcon as BaseArrowLineUp,
  ArrowRightIcon as BaseArrowRight,
  ArrowUUpLeftIcon as BaseArrowUUpLeft,
  ArrowUpIcon as BaseArrowUp,
  ArrowUpRightIcon as BaseArrowUpRight,
  ArrowsClockwiseIcon as BaseArrowsClockwise,
  ArrowsDownUpIcon as BaseArrowsDownUp,
  BabyIcon as BaseBaby,
  BankIcon as BaseBank,
  BarbellIcon as BaseBarbell,
  BarricadeIcon as BaseBarricade,
  BathtubIcon as BaseBathtub,
  BedIcon as BaseBed,
  BookOpenIcon as BaseBookOpen,
  BookOpenTextIcon as BaseBookOpenText,
  BowlFoodIcon as BaseBowlFood,
  BriefcaseIcon as BaseBriefcase,
  BroomIcon as BaseBroom,
  BugIcon as BaseBug,
  BuildingsIcon as BaseBuildings,
  CalculatorIcon as BaseCalculator,
  CalendarBlankIcon as BaseCalendarBlank,
  CalendarCheckIcon as BaseCalendarCheck,
  CalendarDotsIcon as BaseCalendarDots,
  CalendarHeartIcon as BaseCalendarHeart,
  CalendarPlusIcon as BaseCalendarPlus,
  CameraIcon as BaseCamera,
  CarIcon as BaseCar,
  CaretDownIcon as BaseCaretDown,
  CaretLeftIcon as BaseCaretLeft,
  CaretRightIcon as BaseCaretRight,
  CaretUpDownIcon as BaseCaretUpDown,
  CaretUpIcon as BaseCaretUp,
  ChartBarIcon as BaseChartBar,
  ChartBarHorizontalIcon as BaseChartBarHorizontal,
  ChartLineUpIcon as BaseChartLineUp,
  ChatIcon as BaseChat,
  ChatCircleIcon as BaseChatCircle,
  ChatTextIcon as BaseChatText,
  CheckIcon as BaseCheck,
  CheckCircleIcon as BaseCheckCircle,
  CircleIcon as BaseCircle,
  CircleNotchIcon as BaseCircleNotch,
  ClipboardTextIcon as BaseClipboardText,
  ClockIcon as BaseClock,
  CoffeeIcon as BaseCoffee,
  CompassIcon as BaseCompass,
  ConfettiIcon as BaseConfetti,
  CookieIcon as BaseCookie,
  CookingPotIcon as BaseCookingPot,
  CopyIcon as BaseCopy,
  CouchIcon as BaseCouch,
  CreditCardIcon as BaseCreditCard,
  CursorClickIcon as BaseCursorClick,
  DeviceMobileIcon as BaseDeviceMobile,
  DoorOpenIcon as BaseDoorOpen,
  DotsThreeIcon as BaseDotsThree,
  DownloadSimpleIcon as BaseDownloadSimple,
  DropIcon as BaseDrop,
  EnvelopeIcon as BaseEnvelope,
  EnvelopeOpenIcon as BaseEnvelopeOpen,
  EyeIcon as BaseEye,
  EyeSlashIcon as BaseEyeSlash,
  FanIcon as BaseFan,
  FileArrowUpIcon as BaseFileArrowUp,
  FileXIcon as BaseFileX,
  FireIcon as BaseFire,
  FlagIcon as BaseFlag,
  FloppyDiskIcon as BaseFloppyDisk,
  ForkKnifeIcon as BaseForkKnife,
  FunnelIcon as BaseFunnel,
  GearIcon as BaseGear,
  GlobeIcon as BaseGlobe,
  GlobeHemisphereWestIcon as BaseGlobeHemisphereWest,
  GridFourIcon as BaseGridFour,
  HammerIcon as BaseHammer,
  HourglassIcon as BaseHourglass,
  HouseIcon as BaseHouse,
  ImageSquareIcon as BaseImageSquare,
  ImagesIcon as BaseImages,
  InfoIcon as BaseInfo,
  KeyIcon as BaseKey,
  LaptopIcon as BaseLaptop,
  LayoutIcon as BaseLayout,
  LifebuoyIcon as BaseLifebuoy,
  LightningIcon as BaseLightning,
  LinkIcon as BaseLink,
  LinkBreakIcon as BaseLinkBreak,
  ListIcon as BaseList,
  ListChecksIcon as BaseListChecks,
  LockIcon as BaseLock,
  MagnifyingGlassIcon as BaseMagnifyingGlass,
  MapPinIcon as BaseMapPin,
  MinusIcon as BaseMinus,
  MoneyIcon as BaseMoney,
  MonitorIcon as BaseMonitor,
  MonitorPlayIcon as BaseMonitorPlay,
  MoonIcon as BaseMoon,
  MountainsIcon as BaseMountains,
  NotebookIcon as BaseNotebook,
  OvenIcon as BaseOven,
  PackageIcon as BasePackage,
  PaperPlaneTiltIcon as BasePaperPlaneTilt,
  PaperclipIcon as BasePaperclip,
  PawPrintIcon as BasePawPrint,
  PencilSimpleIcon as BasePencilSimple,
  PercentIcon as BasePercent,
  PhoneIcon as BasePhone,
  PlayIcon as BasePlay,
  PlusIcon as BasePlus,
  ProhibitIcon as BaseProhibit,
  QrCodeIcon as BaseQrCode,
  QuestionIcon as BaseQuestion,
  ReceiptIcon as BaseReceipt,
  RepeatIcon as BaseRepeat,
  ScrollIcon as BaseScroll,
  SecurityCameraIcon as BaseSecurityCamera,
  ShareNetworkIcon as BaseShareNetwork,
  ShieldIcon as BaseShield,
  ShieldCheckIcon as BaseShieldCheck,
  ShieldSlashIcon as BaseShieldSlash,
  ShieldWarningIcon as BaseShieldWarning,
  ShoppingCartIcon as BaseShoppingCart,
  ShowerIcon as BaseShower,
  SignInIcon as BaseSignIn,
  SignOutIcon as BaseSignOut,
  SkipForwardIcon as BaseSkipForward,
  SlidersHorizontalIcon as BaseSlidersHorizontal,
  SnowflakeIcon as BaseSnowflake,
  SparkleIcon as BaseSparkle,
  SquaresFourIcon as BaseSquaresFour,
  StackIcon as BaseStack,
  StarIcon as BaseStar,
  StorefrontIcon as BaseStorefront,
  SunIcon as BaseSun,
  TShirtIcon as BaseTShirt,
  TagIcon as BaseTag,
  TelevisionIcon as BaseTelevision,
  TicketIcon as BaseTicket,
  TimerIcon as BaseTimer,
  TrashIcon as BaseTrash,
  TrayIcon as BaseTray,
  TreeIcon as BaseTree,
  TrendUpIcon as BaseTrendUp,
  TrophyIcon as BaseTrophy,
  UmbrellaIcon as BaseUmbrella,
  UploadSimpleIcon as BaseUploadSimple,
  UserCircleIcon as BaseUserCircle,
  UserIcon as BaseUser,
  UserGearIcon as BaseUserGear,
  UserPlusIcon as BaseUserPlus,
  UsersIcon as BaseUsers,
  UsersThreeIcon as BaseUsersThree,
  WalletIcon as BaseWallet,
  WarningIcon as BaseWarning,
  WarningCircleIcon as BaseWarningCircle,
  WashingMachineIcon as BaseWashingMachine,
  WavesIcon as BaseWaves,
  WheelchairIcon as BaseWheelchair,
  WifiHighIcon as BaseWifiHigh,
  WindIcon as BaseWind,
  WrenchIcon as BaseWrench,
  XIcon as BaseX,
  XCircleIcon as BaseXCircle,
} from "@phosphor-icons/react/ssr";

/**
 * Hostayo's icons: Phosphor in the bold weight, 24px unless a class sizes
 * them. Import icons from here, not from @phosphor-icons/react, so the weight
 * stays the same everywhere. Pass `weight="fill"` for a solid icon. These use
 * the SSR build, which works in server and client components alike.
 */
export type { Icon as PhosphorIcon, IconProps };

function bold(Base: Icon): Icon {
  function BoldIcon({ weight = "bold", size = 24, ...props }: IconProps) {
    return <Base weight={weight} size={size} {...props} />;
  }
  BoldIcon.displayName = Base.displayName;
  return BoldIcon as unknown as Icon;
}

export const ArrowCounterClockwise = bold(BaseArrowCounterClockwise);
export const ArrowDown = bold(BaseArrowDown);
export const ArrowDownRight = bold(BaseArrowDownRight);
export const ArrowLeft = bold(BaseArrowLeft);
export const ArrowLineDown = bold(BaseArrowLineDown);
export const ArrowLineUp = bold(BaseArrowLineUp);
export const ArrowRight = bold(BaseArrowRight);
export const ArrowUUpLeft = bold(BaseArrowUUpLeft);
export const ArrowUp = bold(BaseArrowUp);
export const ArrowUpRight = bold(BaseArrowUpRight);
export const ArrowsClockwise = bold(BaseArrowsClockwise);
export const ArrowsDownUp = bold(BaseArrowsDownUp);
export const Baby = bold(BaseBaby);
export const Bank = bold(BaseBank);
export const Barbell = bold(BaseBarbell);
export const Barricade = bold(BaseBarricade);
export const Bathtub = bold(BaseBathtub);
export const Bed = bold(BaseBed);
export const BookOpen = bold(BaseBookOpen);
export const BookOpenText = bold(BaseBookOpenText);
export const BowlFood = bold(BaseBowlFood);
export const Briefcase = bold(BaseBriefcase);
export const Broom = bold(BaseBroom);
export const Bug = bold(BaseBug);
export const Buildings = bold(BaseBuildings);
export const Calculator = bold(BaseCalculator);
export const CalendarBlank = bold(BaseCalendarBlank);
export const CalendarCheck = bold(BaseCalendarCheck);
export const CalendarDots = bold(BaseCalendarDots);
export const CalendarHeart = bold(BaseCalendarHeart);
export const CalendarPlus = bold(BaseCalendarPlus);
export const Camera = bold(BaseCamera);
export const Car = bold(BaseCar);
export const CaretDown = bold(BaseCaretDown);
export const CaretLeft = bold(BaseCaretLeft);
export const CaretRight = bold(BaseCaretRight);
export const CaretUp = bold(BaseCaretUp);
export const CaretUpDown = bold(BaseCaretUpDown);
export const ChartBar = bold(BaseChartBar);
export const ChartBarHorizontal = bold(BaseChartBarHorizontal);
export const ChartLineUp = bold(BaseChartLineUp);
export const Chat = bold(BaseChat);
export const ChatCircle = bold(BaseChatCircle);
export const ChatText = bold(BaseChatText);
export const Check = bold(BaseCheck);
export const CheckCircle = bold(BaseCheckCircle);
export const Circle = bold(BaseCircle);
export const CircleNotch = bold(BaseCircleNotch);
export const ClipboardText = bold(BaseClipboardText);
export const Clock = bold(BaseClock);
export const Coffee = bold(BaseCoffee);
export const Compass = bold(BaseCompass);
export const Confetti = bold(BaseConfetti);
export const Cookie = bold(BaseCookie);
export const CookingPot = bold(BaseCookingPot);
export const Copy = bold(BaseCopy);
export const Couch = bold(BaseCouch);
export const CreditCard = bold(BaseCreditCard);
export const CursorClick = bold(BaseCursorClick);
export const DeviceMobile = bold(BaseDeviceMobile);
export const DoorOpen = bold(BaseDoorOpen);
export const DotsThree = bold(BaseDotsThree);
export const DownloadSimple = bold(BaseDownloadSimple);
export const Drop = bold(BaseDrop);
export const Envelope = bold(BaseEnvelope);
export const EnvelopeOpen = bold(BaseEnvelopeOpen);
export const Eye = bold(BaseEye);
export const EyeSlash = bold(BaseEyeSlash);
export const Fan = bold(BaseFan);
export const FileArrowUp = bold(BaseFileArrowUp);
export const FileX = bold(BaseFileX);
export const Fire = bold(BaseFire);
export const Flag = bold(BaseFlag);
export const FloppyDisk = bold(BaseFloppyDisk);
export const ForkKnife = bold(BaseForkKnife);
export const Funnel = bold(BaseFunnel);
export const Gear = bold(BaseGear);
export const Globe = bold(BaseGlobe);
export const GlobeHemisphereWest = bold(BaseGlobeHemisphereWest);
export const GridFour = bold(BaseGridFour);
export const Hammer = bold(BaseHammer);
export const Hourglass = bold(BaseHourglass);
export const House = bold(BaseHouse);
export const ImageSquare = bold(BaseImageSquare);
export const Images = bold(BaseImages);
export const Info = bold(BaseInfo);
export const Key = bold(BaseKey);
export const Laptop = bold(BaseLaptop);
export const Layout = bold(BaseLayout);
export const Lifebuoy = bold(BaseLifebuoy);
export const Lightning = bold(BaseLightning);
export const Link = bold(BaseLink);
export const LinkBreak = bold(BaseLinkBreak);
export const List = bold(BaseList);
export const ListChecks = bold(BaseListChecks);
export const Lock = bold(BaseLock);
export const MagnifyingGlass = bold(BaseMagnifyingGlass);
export const MapPin = bold(BaseMapPin);
export const Minus = bold(BaseMinus);
export const Money = bold(BaseMoney);
export const Monitor = bold(BaseMonitor);
export const MonitorPlay = bold(BaseMonitorPlay);
export const Moon = bold(BaseMoon);
export const Mountains = bold(BaseMountains);
export const Notebook = bold(BaseNotebook);
export const Oven = bold(BaseOven);
export const Package = bold(BasePackage);
export const PaperPlaneTilt = bold(BasePaperPlaneTilt);
export const Paperclip = bold(BasePaperclip);
export const PawPrint = bold(BasePawPrint);
export const PencilSimple = bold(BasePencilSimple);
export const Percent = bold(BasePercent);
export const Phone = bold(BasePhone);
export const Play = bold(BasePlay);
export const Plus = bold(BasePlus);
export const Prohibit = bold(BaseProhibit);
export const QrCode = bold(BaseQrCode);
export const Question = bold(BaseQuestion);
export const Receipt = bold(BaseReceipt);
export const Repeat = bold(BaseRepeat);
export const Scroll = bold(BaseScroll);
export const SecurityCamera = bold(BaseSecurityCamera);
export const ShareNetwork = bold(BaseShareNetwork);
export const Shield = bold(BaseShield);
export const ShieldCheck = bold(BaseShieldCheck);
export const ShieldSlash = bold(BaseShieldSlash);
export const ShieldWarning = bold(BaseShieldWarning);
export const ShoppingCart = bold(BaseShoppingCart);
export const Shower = bold(BaseShower);
export const SignIn = bold(BaseSignIn);
export const SignOut = bold(BaseSignOut);
export const SkipForward = bold(BaseSkipForward);
export const SlidersHorizontal = bold(BaseSlidersHorizontal);
export const Snowflake = bold(BaseSnowflake);
export const Sparkle = bold(BaseSparkle);
export const SquaresFour = bold(BaseSquaresFour);
export const Stack = bold(BaseStack);
export const Star = bold(BaseStar);
export const Storefront = bold(BaseStorefront);
export const Sun = bold(BaseSun);
export const TShirt = bold(BaseTShirt);
export const Tag = bold(BaseTag);
export const Television = bold(BaseTelevision);
export const Ticket = bold(BaseTicket);
export const Timer = bold(BaseTimer);
export const Trash = bold(BaseTrash);
export const Tray = bold(BaseTray);
export const Tree = bold(BaseTree);
export const TrendUp = bold(BaseTrendUp);
export const Trophy = bold(BaseTrophy);
export const Umbrella = bold(BaseUmbrella);
export const UploadSimple = bold(BaseUploadSimple);
export const User = bold(BaseUser);
export const UserCircle = bold(BaseUserCircle);
export const UserGear = bold(BaseUserGear);
export const UserPlus = bold(BaseUserPlus);
export const Users = bold(BaseUsers);
export const UsersThree = bold(BaseUsersThree);
export const Wallet = bold(BaseWallet);
export const Warning = bold(BaseWarning);
export const WarningCircle = bold(BaseWarningCircle);
export const WashingMachine = bold(BaseWashingMachine);
export const Waves = bold(BaseWaves);
export const Wheelchair = bold(BaseWheelchair);
export const WifiHigh = bold(BaseWifiHigh);
export const Wind = bold(BaseWind);
export const Wrench = bold(BaseWrench);
export const X = bold(BaseX);
export const XCircle = bold(BaseXCircle);
