"""Saints of the Bible post their own words, copied from the Douay-Rheims (each checked as an exact substring of the verses).
Also adds four missing accounts: St. John the Baptist, St. Elizabeth, St. Zachary and St. Simeon.
usage: python3 -I add_biblical.py PROJECT
"""
import hashlib, json, sys
P = sys.argv[1]
b = json.load(open(P + '/data/bible.json')); BK = {x['code']: x for x in b['books']}
def g(code, c, v): x = BK[code]; return x['start'] + sum(x['ch'][:c - 1]) + v - 1
def span(ref):
    code, cv = ref.split(' '); c, vv = cv.split(':'); a, _, e = vv.partition('-')
    return code, int(c), int(a), int(e or a)
NAME = {x['code']: (x['name'] if x['code'] != 'PSA' else 'Psalm') for x in b['books']}
NAME['1KI'] = '3 Kings (1 Kings)'

# (saint, Douay-Rheims reference, exact words, themes)
Q = [
 ('blessed_virgin_mary', 'LUK 1:34', 'How shall this be done, because I know not man?', ['annunciation', 'faith']),
 ('blessed_virgin_mary', 'LUK 1:38', 'Behold the handmaid of the Lord; be it done to me according to thy word.', ['obedience', 'humility', 'annunciation']),
 ('blessed_virgin_mary', 'LUK 1:46-49', 'My soul doth magnify the Lord. And my spirit hath rejoiced in God my Saviour. Because he hath regarded the humility of his handmaid; for behold from henceforth all generations shall call me blessed. Because he that is mighty, hath done great things to me; and holy is his name.', ['praise', 'magnificat', 'humility']),
 ('blessed_virgin_mary', 'LUK 1:50-53', 'And his mercy is from generation unto generations, to them that fear him. He hath shewed might in his arm: he hath scattered the proud in the conceit of their heart. He hath put down the mighty from their seat, and hath exalted the humble. He hath filled the hungry with good things; and the rich he hath sent empty away.', ['mercy', 'magnificat', 'justice']),
 ('blessed_virgin_mary', 'LUK 1:54-55', 'He hath received Israel his servant, being mindful of his mercy: As he spoke to our fathers, to Abraham and to his seed for ever.', ['mercy', 'magnificat', 'promise']),
 ('blessed_virgin_mary', 'LUK 2:48', 'Son, why hast thou done so to us? behold thy father and I have sought thee sorrowing.', ['family', 'sorrow', 'seeking']),
 ('blessed_virgin_mary', 'JOH 2:3', 'They have no wine.', ['intercession', 'cana']),
 ('blessed_virgin_mary', 'JOH 2:5', 'Whatsoever he shall say to you, do ye.', ['obedience', 'cana', 'trust']),
 ('peter_apostle', 'MAT 16:16', 'Thou art Christ, the Son of the living God.', ['faith', 'confession']),
 ('peter_apostle', 'JOH 6:69-70', 'Lord, to whom shall we go? thou hast the words of eternal life. And we have believed and have known, that thou art the Christ, the Son of God.', ['faith', 'eternal life']),
 ('peter_apostle', 'LUK 5:8', 'Depart from me, for I am a sinful man, O Lord.', ['humility', 'repentance']),
 ('peter_apostle', 'MAT 14:30', 'Lord, save me.', ['prayer', 'trust']),
 ('peter_apostle', 'JOH 13:9', 'Lord, not only my feet, but also my hands and my head.', ['love', 'devotion']),
 ('peter_apostle', 'JOH 21:17', 'Lord, thou knowest all things: thou knowest that I love thee.', ['love', 'repentance']),
 ('peter_apostle', 'ACT 2:38', 'Do penance, and be baptized every one of you in the name of Jesus Christ, for the remission of your sins: and you shall receive the gift of the Holy Ghost.', ['baptism', 'repentance', 'holy spirit']),
 ('peter_apostle', 'ACT 3:6', 'Silver and gold I have none; but what I have, I give thee: In the name of Jesus Christ of Nazareth, arise, and walk.', ['healing', 'name of jesus']),
 ('peter_apostle', 'ACT 4:12', 'Neither is there salvation in any other. For there is no other name under heaven given to men, whereby we must be saved.', ['salvation', 'name of jesus']),
 ('peter_apostle', 'ACT 5:29', 'We ought to obey God, rather than men.', ['obedience', 'courage']),
 ('peter_apostle', 'ACT 10:34-35', 'In very deed I perceive, that God is not a respecter of persons. But in every nation, he that feareth him, and worketh justice, is acceptable to him.', ['all nations', 'justice']),
 ('peter_apostle', '1PE 2:9', 'But you are a chosen generation, a kingly priesthood, a holy nation, a purchased people: that you may declare his virtues, who hath called you out of darkness into his marvellous light', ['vocation', 'light', 'church']),
 ('peter_apostle', '1PE 3:15', 'But sanctify the Lord Christ in your hearts, being ready always to satisfy every one that asketh you a reason of that hope which is in you.', ['hope', 'witness']),
 ('peter_apostle', '1PE 4:8', 'But before all things have a constant mutual charity among yourselves: for charity covereth a multitude of sins.', ['charity']),
 ('peter_apostle', '1PE 5:7-9', 'Casting all your care upon him, for he hath care of you. Be sober and watch: because your adversary the devil, as a roaring lion, goeth about seeking whom he may devour. Whom resist ye, strong in faith', ['trust', 'spiritual warfare', 'watchfulness']),
 ('paul_apostle', 'ACT 9:6', 'Lord, what wilt thou have me to do?', ['conversion', 'obedience']),
 ('paul_apostle', 'ACT 17:27-28', 'That they should seek God, if happily they may feel after him or find him, although he be not far from every one of us: For in him we live, and move, and are', ['seeking god', 'creation']),
 ('paul_apostle', 'ACT 20:24', 'But I fear none of these things, neither do I count my life more precious than myself, so that I may consummate my course and the ministry of the word which I received from the Lord Jesus, to testify the gospel of the grace of God.', ['courage', 'mission']),
 ('paul_apostle', 'ACT 20:35', 'remember the word of the Lord Jesus, how he said: It is a more blessed thing to give, rather than to receive.', ['generosity', 'service']),
 ('paul_apostle', '1CO 13:4-7', 'Charity is patient, is kind: charity envieth not, dealeth not perversely; is not puffed up; Is not ambitious, seeketh not her own, is not provoked to anger, thinketh no evil; Rejoiceth not in iniquity, but rejoiceth with the truth; Beareth all things, believeth all things, hopeth all things, endureth all things.', ['charity']),
 ('paul_apostle', '1CO 13:13', 'And now there remain faith, hope, and charity, these three: but the greatest of these is charity.', ['charity', 'faith', 'hope']),
 ('paul_apostle', 'GAL 2:20', 'And I live, now not I; but Christ liveth in me. And that I live now in the flesh: I live in the faith of the Son of God, who loved me, and delivered himself for me.', ['union with christ', 'faith']),
 ('paul_apostle', 'PHI 1:21', 'For to me, to live is Christ; and to die is gain.', ['christ', 'death']),
 ('paul_apostle', 'PHI 4:13', 'I can do all these things in him who strengtheneth me.', ['strength', 'trust']),
 ('paul_apostle', 'ROM 8:28', 'And we know that to them that love God, all things work together unto good', ['providence', 'love of god']),
 ('paul_apostle', 'ROM 8:38-39', 'For I am sure that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, nor might, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.', ['love of god', 'hope']),
 ('paul_apostle', '2CO 12:9-10', 'Gladly therefore will I glory in my infirmities, that the power of Christ may dwell in me. For which cause I please myself in my infirmities, in reproaches, in necessities, in persecutions, in distresses, for Christ. For when I am weak, then am I powerful.', ['weakness', 'grace']),
 ('paul_apostle', 'GAL 6:14', 'But God forbid that I should glory, save in the cross of our Lord Jesus Christ; by whom the world is crucified to me, and I to the world.', ['cross']),
 ('paul_apostle', 'EPH 6:11-12', 'Put you on the armour of God, that you may be able to stand against the deceits of the devil. For our wrestling is not against flesh and blood; but against principalities and power, against the rulers of the world of this darkness, against the spirits of wickedness in the high places.', ['spiritual warfare']),
 ('paul_apostle', 'ROM 12:21', 'Be not overcome by evil, but overcome evil by good.', ['good and evil']),
 ('paul_apostle', '2TI 4:7-8', 'I have fought a good fight, I have finished my course, I have kept the faith. As to the rest, there is laid up for me a crown of justice, which the Lord the just judge will render to me in that day: and not only to me, but to them also that love his coming.', ['perseverance', 'heaven']),
 ('john_apostle', 'JOH 1:14', 'And the Word was made flesh, and dwelt among us, (and we saw his glory, the glory as it were of the only begotten of the Father,) full of grace and truth.', ['incarnation']),
 ('john_apostle', 'JOH 21:7', 'It is the Lord.', ['recognition', 'faith']),
 ('john_apostle', 'JOH 20:31', 'But these are written, that you may believe that Jesus is the Christ, the Son of God: and that believing, you may have life in his name.', ['faith', 'scripture', 'life']),
 ('john_apostle', '1JO 1:5', 'That God is light, and in him there is no darkness.', ['light']),
 ('john_apostle', '1JO 3:1', 'Behold what manner of charity the Father hath bestowed upon us, that we should be called, and should be the sons of God.', ['children of god', 'love of god']),
 ('john_apostle', '1JO 3:18', 'My little children, let us not love in word, nor in tongue, but in deed, and in truth.', ['charity', 'deeds']),
 ('john_apostle', '1JO 4:16', 'God is charity: and he that abideth in charity, abideth in God, and God in him.', ['charity', 'love of god']),
 ('john_apostle', '1JO 4:18', 'Fear is not in charity: but perfect charity casteth out fear', ['charity', 'fear']),
 ('john_apostle', '1JO 4:19-20', 'Let us therefore love God, because God first hath loved us. If any man say, I love God, and hateth his brother; he is a liar. For he that loveth not his brother, whom he seeth, how can he love God, whom he seeth not?', ['love of neighbour', 'love of god']),
 ('john_apostle', '1JO 5:4', 'this is the victory which overcometh the world, our faith.', ['faith', 'victory']),
 ('jude_apostle', 'JUD 1:3', 'to beseech you to contend earnestly for the faith once delivered to the saints.', ['faith', 'tradition']),
 ('jude_apostle', 'JUD 1:20-21', 'But you, my beloved, building yourselves upon your most holy faith, praying in the Holy Ghost, Keep yourselves in the love of God, waiting for the mercy of our Lord Jesus Christ, unto life everlasting.', ['prayer', 'perseverance']),
 ('jude_apostle', 'JUD 1:24-25', 'Now to him who is able to preserve you without sin, and to present you spotless before the presence of his glory with exceeding joy, in the coming of our Lord Jesus Christ, To the only God our Saviour through Jesus Christ our Lord, be glory and magnificence, empire and power, before all ages, and now, and for all ages of ages. Amen.', ['praise', 'doxology']),
 ('thomas_apostle', 'JOH 11:16', 'Let us also go, that we may die with him.', ['courage', 'discipleship']),
 ('thomas_apostle', 'JOH 14:5', 'Lord, we know not whither thou goest; and how can we know the way?', ['the way', 'questions']),
 ('thomas_apostle', 'JOH 20:25', 'Except I shall see in his hands the print of the nails, and put my finger into the place of the nails, and put my hand into his side, I will not believe.', ['doubt']),
 ('thomas_apostle', 'JOH 20:28', 'My Lord, and my God.', ['faith', 'resurrection']),
 ('andrew_apostle', 'JOH 1:41', 'We have found the Messias, which is, being interpreted, the Christ.', ['vocation', 'witness']),
 ('andrew_apostle', 'JOH 6:9', 'There is a boy here that hath five barley loaves, and two fishes; but what are these among so many?', ['trust', 'providence']),
 ('philip_apostle', 'JOH 1:45', 'We have found him of whom Moses in the law, and the prophets did write, Jesus the son of Joseph of Nazareth.', ['witness', 'vocation']),
 ('philip_apostle', 'JOH 1:46', 'Come and see.', ['invitation', 'witness']),
 ('philip_apostle', 'JOH 14:8', 'Lord, shew us the Father, and it is enough for us.', ['god the father', 'desire for god']),
 ('bartholomew_apostle', 'JOH 1:49', 'Rabbi, thou art the Son of God, thou art the King of Israel.', ['faith', 'confession']),
 ('luke_evangelist', 'LUK 1:3-4', 'It seemed good to me also, having diligently attained to all things from the beginning, to write to thee in order, most excellent Theophilus, That thou mayest know the verity of those words in which thou hast been instructed.', ['gospel', 'truth']),
 ('mark_evangelist', 'MAR 1:1', 'The beginning of the gospel of Jesus Christ, the Son of God.', ['gospel']),
 ('stephen_the_first_martyr', 'ACT 7:55', 'Behold, I see the heavens opened, and the Son of man standing on the right hand of God.', ['vision', 'heaven']),
 ('stephen_the_first_martyr', 'ACT 7:58', 'Lord Jesus, receive my spirit.', ['martyrdom', 'prayer']),
 ('stephen_the_first_martyr', 'ACT 7:59', 'Lord, lay not this sin to their charge.', ['forgiveness', 'martyrdom']),
 ('martha_of_bethany', 'LUK 10:40', 'Lord, hast thou no care that my sister hath left me alone to serve? speak to her therefore, that she help me.', ['service', 'honesty']),
 ('martha_of_bethany', 'JOH 11:21-22', 'Lord, if thou hadst been here, my brother had not died. But now also I know that whatsoever thou wilt ask of God, God will give it thee.', ['grief', 'faith']),
 ('martha_of_bethany', 'JOH 11:24', 'I know that he shall rise again, in the resurrection at the last day.', ['resurrection', 'hope']),
 ('martha_of_bethany', 'JOH 11:27', 'Yea, Lord, I have believed that thou art Christ the Son of the living God, who art come into this world.', ['faith', 'confession']),
 ('mary_of_bethany', 'JOH 11:32', 'Lord, if thou hadst been here, my brother had not died.', ['grief', 'faith']),
 ('mary_magdalene', 'JOH 20:13', 'Because they have taken away my Lord; and I know not where they have laid him.', ['grief', 'seeking']),
 ('mary_magdalene', 'JOH 20:15', 'Sir, if thou hast taken him hence, tell me where thou hast laid him, and I will take him away.', ['love', 'seeking']),
 ('mary_magdalene', 'JOH 20:16', 'Rabboni (which is to say, Master).', ['recognition', 'resurrection']),
 ('mary_magdalene', 'JOH 20:18', 'I have seen the Lord', ['resurrection', 'witness']),
 ('gabriel_archangel', 'LUK 1:19', 'I am Gabriel, who stand before God: and am sent to speak to thee, and to bring thee these good tidings.', ['angels', 'good news']),
 ('gabriel_archangel', 'LUK 1:13', 'Fear not, Zachary, for thy prayer is heard; and thy wife Elizabeth shall bear thee a son, and thou shalt call his name John', ['prayer', 'promise']),
 ('gabriel_archangel', 'LUK 1:28', 'Hail, full of grace, the Lord is with thee: blessed art thou among women.', ['mary', 'annunciation', 'grace']),
 ('gabriel_archangel', 'LUK 1:30-33', 'Fear not, Mary, for thou hast found grace with God. Behold thou shalt conceive in thy womb, and shalt bring forth a son; and thou shalt call his name Jesus. He shall be great, and shall be called the Son of the most High; and the Lord God shall give unto him the throne of David his father; and he shall reign in the house of Jacob for ever. And of his kingdom there shall be no end.', ['annunciation', 'christ', 'kingdom']),
 ('gabriel_archangel', 'LUK 1:35', 'The Holy Ghost shall come upon thee, and the power of the most High shall overshadow thee. And therefore also the Holy which shall be born of thee shall be called the Son of God.', ['holy spirit', 'incarnation']),
 ('gabriel_archangel', 'LUK 1:37', 'Because no word shall be impossible with God.', ['faith', 'power of god']),
 ('raphael_archangel', 'TOB 12:6', 'Bless ye the God of heaven, give glory to him in the sight of all that live, because he hath shewn his mercy to you.', ['praise', 'mercy']),
 ('raphael_archangel', 'TOB 12:7', 'For it is good to hide the secret of a king: but honourable to reveal and confess the works of God.', ['witness', 'praise']),
 ('raphael_archangel', 'TOB 12:8-9', 'Prayer is good with fasting and alms more than to lay up treasures of gold: For alms delivereth from death, and the same is that which purgeth away sins, and maketh to find mercy and life everlasting.', ['prayer', 'fasting', 'almsgiving']),
 ('raphael_archangel', 'TOB 12:12', 'When thou didst pray with tears, and didst bury the dead, and didst leave thy dinner, and hide the dead by day in thy house, and bury them by night, I offered thy prayer to the Lord.', ['prayer', 'works of mercy', 'angels']),
 ('raphael_archangel', 'TOB 12:15', 'For I am the angel Raphael, one of the seven, who stand before the Lord.', ['angels']),
 ('raphael_archangel', 'TOB 12:17-18', 'Peace be to you, fear not. For when I was with you, I was there by the will of God: bless ye him, and sing praises to him.', ['peace', 'providence', 'praise']),
 ('raphael_archangel', 'TOB 12:20', 'It is time therefore that I return to him that sent me: but bless ye God, and publish all his wonderful works.', ['praise', 'mission']),
 ('raphael_archangel', 'TOB 5:13', 'Be of good courage, thy cure from God is at hand.', ['healing', 'hope']),
 ('michael_archangel', 'JUD 1:9', 'The Lord command thee.', ['spiritual warfare', 'humility']),
 ('elijah_prophet', '1KI 18:21', 'How long do you halt between two sides? if the Lord be God, follow him', ['decision', 'faith']),
 ('elijah_prophet', '1KI 18:36-37', 'O Lord God of Abraham, and Isaac, and Israel, shew this day that thou art the God of Israel, and I thy servant, and that according to thy commandment I have done all these things. Hear me, O Lord, hear me: that this people may learn, that thou art the Lord God, and that thou hast turned their heart again.', ['prayer', 'conversion']),
 ('elijah_prophet', '1KI 19:4', 'It is enough for me, Lord, take away my soul: for I am no better than my fathers.', ['weariness', 'prayer']),
 ('elijah_prophet', '1KI 19:10', 'With zeal have I been zealous for the Lord God of hosts', ['zeal']),
 ('dismas_the_good_thief', 'LUK 23:40-42', 'Neither dost thou fear God, seeing thou art condemned under the same condemnation? And we indeed justly, for we receive the due reward of our deeds; but this man hath done no evil. And he said to Jesus: Lord, remember me when thou shalt come into thy kingdom.', ['repentance', 'mercy', 'paradise']),
 ('lydia_of_philippi', 'ACT 16:15', 'If you have judged me to be faithful to the Lord, come into my house, and abide there.', ['hospitality', 'faith']),
 ('john_the_baptist', 'MAT 3:2', 'Do penance: for the kingdom of heaven is at hand.', ['repentance', 'kingdom']),
 ('john_the_baptist', 'MAT 3:11', 'I indeed baptize you in the water unto penance, but he that shall come after me, is mightier than I, whose shoes I am not worthy to bear; he shall baptize you in the Holy Ghost and fire.', ['baptism', 'humility', 'holy spirit']),
 ('john_the_baptist', 'MAT 3:14', 'I ought to be baptized by thee, and comest thou to me?', ['humility']),
 ('john_the_baptist', 'JOH 1:23', 'I am the voice of one crying out in the wilderness, make straight the way of the Lord, as said the prophet Isaias.', ['preparation', 'advent']),
 ('john_the_baptist', 'JOH 1:29', 'Behold the Lamb of God, behold him who taketh away the sin of the world.', ['lamb of god', 'eucharist']),
 ('john_the_baptist', 'JOH 1:34', 'And I saw, and I gave testimony, that this is the Son of God.', ['witness']),
 ('john_the_baptist', 'JOH 3:27', 'A man cannot receive any thing, unless it be given him from heaven.', ['grace', 'humility']),
 ('john_the_baptist', 'JOH 3:29-30', "the friend of the bridegroom, who standeth and heareth him, rejoiceth with joy because of the bridegroom's voice. This my joy therefore is fulfilled. He must increase, but I must decrease.", ['humility', 'joy']),
 ('john_the_baptist', 'LUK 3:11', 'He that hath two coats, let him give to him that hath none; and he that hath meat, let him do in like manner.', ['charity', 'sharing']),
 ('elizabeth_mother_of_john_the_baptist', 'LUK 1:42-45', 'Blessed art thou among women, and blessed is the fruit of thy womb. And whence is this to me, that the mother of my Lord should come to me? For behold as soon as the voice of thy salutation sounded in my ears, the infant in my womb leaped for joy. And blessed art thou that hast believed, because those things shall be accomplished that were spoken to thee by the Lord.', ['mary', 'visitation', 'joy']),
 ('elizabeth_mother_of_john_the_baptist', 'LUK 1:60', 'Not so; but he shall be called John.', ['obedience', 'faith']),
 ('zachary_father_of_john_the_baptist', 'LUK 1:68-71', 'Blessed be the Lord God of Israel; because he hath visited and wrought the redemption of his people: And hath raised up an horn of salvation to us, in the house of David his servant: As he spoke by the mouth of his holy prophets, who are from the beginning: Salvation from our enemies, and from the hand of all that hate us:', ['praise', 'benedictus', 'salvation']),
 ('zachary_father_of_john_the_baptist', 'LUK 1:72-75', 'To perform mercy to our fathers, and to remember his holy testament, The oath, which he swore to Abraham our father, that he would grant to us, That being delivered from the hand of our enemies, we may serve him without fear, In holiness and justice before him, all our days.', ['benedictus', 'holiness', 'freedom']),
 ('zachary_father_of_john_the_baptist', 'LUK 1:76-79', 'And thou, child, shalt be called the prophet of the Highest: for thou shalt go before the face of the Lord to prepare his ways: To give knowledge of salvation to his people, unto the remission of their sins: Through the bowels of the mercy of our God, in which the Orient from on high hath visited us: To enlighten them that sit in darkness, and in the shadow of death: to direct our feet into the way of peace.', ['benedictus', 'mercy', 'light']),
 ('simeon_the_righteous', 'LUK 2:29-32', 'Now thou dost dismiss thy servant, O Lord, according to thy word in peace; Because my eyes have seen thy salvation, Which thou hast prepared before the face of all peoples: A light to the revelation of the Gentiles, and the glory of thy people Israel.', ['nunc dimittis', 'peace', 'light']),
 ('simeon_the_righteous', 'LUK 2:34-35', 'Behold this child is set for the fall, and for the resurrection of many in Israel, and for a sign which shall be contradicted; And thy own soul a sword shall pierce, that, out of many hearts, thoughts may be revealed.', ['prophecy', 'mary', 'sorrow']),
]

NEW = [
 {'id': 'john_the_baptist', 'n': 'St. John the Baptist', 'h': 'JohnTheBaptist', 'f': '06-24', 'fs': 'GRC', 'b': '', 'd': 'c. 30', 't': 'prophet', 'e': 'lamb', 'r': 'Judea',
  'bio': 'Forerunner of Christ, son of Zachary and Elizabeth. He preached repentance by the Jordan, baptized Jesus, pointed him out as the Lamb of God, and was beheaded by Herod Antipas. The Church keeps his birth on 24 June and his martyrdom on 29 August.',
  'p': ['Quebec', 'Puerto Rico', 'Florence'], 'w': 'https://en.wikipedia.org/wiki/John_the_Baptist', 'lv': 'Saint', 'grc': True, 'c': 'high', 'sort': 30},
 {'id': 'elizabeth_mother_of_john_the_baptist', 'n': 'St. Elizabeth', 'h': 'ElizabethMotherOfJohn', 'f': '11-05', 'fs': 'Roman Martyrology', 'b': '', 'd': '', 't': 'lay', 'e': 'lily', 'r': 'Judea',
  'bio': 'Wife of Zachary, mother of John the Baptist and kinswoman of the Virgin Mary. Filled with the Holy Spirit when Mary visited her, she greeted her: "Blessed art thou among women" (Luke 1:42).',
  'p': [], 'w': 'https://en.wikipedia.org/wiki/Elizabeth_(biblical_figure)', 'lv': 'Saint', 'grc': False, 'c': 'high', 'sort': 1},
 {'id': 'zachary_father_of_john_the_baptist', 'n': 'St. Zachary', 'h': 'ZacharyTheProphet', 'f': '11-05', 'fs': 'Roman Martyrology', 'b': '', 'd': '', 't': 'prophet', 'e': 'lamp', 'r': 'Judea',
  'bio': 'Priest of the Temple, husband of Elizabeth and father of John the Baptist. Struck dumb for doubting the angel Gabriel, he spoke again at his son\'s naming and sang the Benedictus (Luke 1:68-79).',
  'p': [], 'w': 'https://en.wikipedia.org/wiki/Zechariah_(New_Testament_figure)', 'lv': 'Saint', 'grc': False, 'c': 'high', 'sort': 1},
 {'id': 'simeon_the_righteous', 'n': 'St. Simeon', 'h': 'SimeonTheJust', 'f': '', 'fs': '', 'b': '', 'd': '', 't': 'prophet', 'e': 'christ_child', 'r': 'Jerusalem',
  'bio': 'The just and devout old man of Jerusalem who took the child Jesus in his arms at the Presentation in the Temple, sang the Nunc dimittis and foretold the sword that would pierce Mary\'s soul (Luke 2:25-35).',
  'p': [], 'w': 'https://en.wikipedia.org/wiki/Simeon_(Gospel_of_Luke)', 'lv': 'Saint', 'grc': False, 'c': 'high', 'sort': 1},
]

sa = json.load(open(P + '/data/saints.json'))
ids = {x['id'] for x in sa['saints']}
for n in NEW:
    if n['id'] not in ids: sa['saints'].append(n)
ids = {x['id'] for x in sa['saints']}
missing = {sid for sid, *_ in Q if sid not in ids}
assert not missing, missing
json.dump(sa, open(P + '/data/saints.json', 'w'), ensure_ascii=False, separators=(',', ':'))

qd = json.load(open(P + '/data/quotes.json'))
qd['q'] = [x for x in qd['q'] if x.get('tr') != 'Douay-Rheims']
bad = []
for sid, ref, words, th in Q:
    code, c, a, e = span(ref)
    text = ' '.join(b['text'][g(code, c, v)] for v in range(a, e + 1))
    if words not in text: bad.append((sid, ref)); continue
    label = f"{NAME[code]} {c}:{a}" + (f"-{e}" if e != a else '')
    qd['q'].append({'i': hashlib.sha1((sid + ref + words).encode()).hexdigest()[:8], 's': sid, 't': words, 'w': label, 'l': '',
                    'tr': 'Douay-Rheims', 'y': '1899', 'g': -1, 'th': th})
assert not bad, bad
json.dump(qd, open(P + '/data/quotes.json', 'w'), ensure_ascii=False, separators=(',', ':'))

cr = json.load(open(P + '/data/credits.json'))
cr['works'] = [w for w in cr['works'] if w.get('tr') != 'Douay-Rheims']
names = {x['id']: x['n'] for x in sa['saints']}
for sid in dict.fromkeys(s for s, *_ in Q):
    cr['works'].append({'saint': names[sid], 'work': 'Their words in Holy Scripture', 'tr': 'Douay-Rheims', 'y': '1899', 'n': sum(1 for s, *_ in Q if s == sid),
                        'url': 'https://ebible.org/find/details.php?id=engDRA'})
cr['works'].sort(key=lambda w: (w['saint'], w['work']))
json.dump(cr, open(P + '/data/credits.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('biblical posts', len(Q), 'from', len({s for s, *_ in Q}), 'saints; new accounts', len(NEW), '; total quotes', len(qd['q']), '; saints posting', len({x['s'] for x in qd['q']}))
